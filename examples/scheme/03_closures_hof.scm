;; ===================================================
;; Scheme Example 3: Closures & Higher-Order Functions
;; ===================================================

;; Counter generator using lexical closures
(define (make-counter initial)
  (let ((val initial))
    (lambda ()
      (set! val (+ val 1))
      val)))

(define c1 (make-counter 100))
(display (c1)) (newline)
(display (c1)) (newline)
(display (c1)) (newline)

;; Map & Filter pipeline
(map (lambda (x) (* x 10))
     (filter (lambda (x) (> x 2)) '(1 2 3 4 5)))
