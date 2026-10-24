type Producto = (String, Double, Int)

subtotal :: [Producto] -> Double
subtotal = sum . map (\(_, precio, cant) -> precio * fromIntegral cant)

descuentoMayoreo :: Double -> Double
descuentoMayoreo t
| t > 500   = t * 0.90
| otherwise = t

iva :: Double -> Double
iva = (* 1.16)

-- Compone una lista de funciones, aplicándolas de izquierda a derecha
componer :: [a -> a] -> a -> a
componer = foldl (flip (.)) id

total :: [Producto] -> Double
total = componer [descuentoMayoreo, iva] . subtotal
total [("leche",120,2),("pan",80,3),("queso",200,1)]