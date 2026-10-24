-- =======================================================
-- Haskell Workspace File
-- Press [Run] or Ctrl+Enter to execute!
-- =======================================================

-- Factorial with recursion
factorial 0 = 1
factorial n = n * factorial (n - 1)

-- List sum
sumList [] = 0
sumList (x:xs) = x + sumList xs

-- Main expression to evaluate
factorial 5
