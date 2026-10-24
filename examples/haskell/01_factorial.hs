-- ===================================================
-- Haskell Example 1: Factorial & Pattern Matching
-- ===================================================

-- Definition with pattern matching
factorial 0 = 1
factorial n = n * factorial (n - 1)

-- Evaluate factorial of 6
factorial 6
