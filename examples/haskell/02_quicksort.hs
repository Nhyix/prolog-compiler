-- ===================================================
-- Haskell Example 2: Classic Quicksort
-- ===================================================

quicksort [] = []
quicksort (x:xs) = quicksort [y | y <- xs, y <= x] ++ [x] ++ quicksort [y | y <- xs, y > x]

-- Test sorting an unsorted list
quicksort [15, 3, 99, 1, 42, 8, 23, 4]
