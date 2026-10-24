;; =======================================================
;; Scheme Workspace File (R7RS)
;; Press [Run] or Ctrl+Enter to execute!
;; =======================================================

(define (fibonacci n)
  (if (< n 2)
      n
      (+ (fibonacci (- n 1)) (fibonacci (- n 2)))))

(display "Computing Fibonacci of 8: ")
(display (fibonacci 8))
(newline)

(map (lambda (x) (* x x)) '(1 2 3 4 5 6))
