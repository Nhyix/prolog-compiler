;; ===================================================
;; Scheme Example 2: Tail-Recursive Factorial & Fibonacci
;; ===================================================

;; Tail-recursive factorial with accumulator
(define (fact-tail n acc)
  (if (<= n 1)
      acc
      (fact-tail (- n 1) (* n acc))))

(define (factorial n)
  (fact-tail n 1))

(display "Factorial of 10 is: ")
(display (factorial 10))
(newline)

(factorial 10)
