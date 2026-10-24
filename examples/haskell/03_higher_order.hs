-- ===================================================
-- Haskell Example 3: Higher-Order Functions & Comprehensions
-- ===================================================

square x = x * x
isEven x = x `mod` 2 == 0

-- Double even numbers from 1 to 10
[x * 2 | x <- [1..10], isEven x]
