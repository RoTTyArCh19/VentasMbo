export function salesQuery(schema) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(schema)) throw new Error('Esquema inválido');
  const branch = (header, lines, type, sign) => `
    SELECT '${type}' AS "Type", H."DocEntry", H."FolioNum", H."DocDate",
      H."DocTotal", H."DocCur", ${sign} AS "Sign",
      COALESCE(L."WhsCode", '') AS "StoreCode",
      COALESCE(NULLIF(L."SlpCode", -1), H."SlpCode", -1) AS "SellerCode",
      COALESCE(L."LineTotal", 0) AS "LineAmount"
    FROM "${schema}"."${header}" H
    LEFT JOIN "${schema}"."${lines}" L ON H."DocEntry" = L."DocEntry"
    WHERE H."CANCELED" = 'N'
      AND H."DocDate" >= TO_DATE(?, 'YYYY-MM-DD')
      AND H."DocDate" <= TO_DATE(?, 'YYYY-MM-DD')`;
  return `WITH "LINES" AS (
    ${branch('OINV','INV1','FACTURA',1)}
    UNION ALL
    ${branch('ORIN','RIN1','NOTA CREDITO',-1)}
  ), "WEIGHTS" AS (
    SELECT *, SUM("LineAmount") OVER (PARTITION BY "Type", "DocEntry") AS "BaseTotal",
      ROW_NUMBER() OVER (PARTITION BY "Type", "DocEntry" ORDER BY "StoreCode", "SellerCode") AS "RowNum"
    FROM "LINES"
  ), "ALLOCATIONS" AS (
    SELECT "Type", "DocEntry", "FolioNum", "DocDate", "DocCur",
      CASE WHEN "BaseTotal" = 0 THEN '' ELSE "StoreCode" END AS "StoreCode",
      CASE WHEN "BaseTotal" = 0 THEN -1 ELSE "SellerCode" END AS "SellerCode",
      CASE WHEN "BaseTotal" = 0 THEN 1 ELSE 0 END AS "Unallocated",
      CASE WHEN "BaseTotal" = 0 THEN CASE WHEN "RowNum" = 1 THEN "Sign" * "DocTotal" ELSE 0 END
        ELSE "Sign" * "DocTotal" * "LineAmount" / NULLIF("BaseTotal", 0) END AS "Amount"
    FROM "WEIGHTS"
  ) SELECT A."Type", A."DocEntry", A."FolioNum", TO_VARCHAR(A."DocDate", 'YYYY-MM-DD') AS "Date",
    A."DocCur", A."StoreCode", COALESCE(W."WhsName", 'Sin bodega / no asignable') AS "StoreName",
    A."SellerCode", COALESCE(S."SlpName", 'Sin vendedor') AS "SellerName", A."Unallocated",
    SUM(A."Amount") AS "Amount"
    FROM "ALLOCATIONS" A
    LEFT JOIN "${schema}"."OWHS" W ON A."StoreCode" = W."WhsCode"
    LEFT JOIN "${schema}"."OSLP" S ON A."SellerCode" = S."SlpCode"
    GROUP BY A."Type", A."DocEntry", A."FolioNum", A."DocDate", A."DocCur", A."StoreCode", W."WhsName", A."SellerCode", S."SlpName", A."Unallocated"
    ORDER BY A."DocDate", A."DocEntry"`;
}
