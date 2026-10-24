;; ===================================================
;; Scheme Example 1: Arithmetic & Function Definitions
;; ===================================================

(define (circle-area radius)
  (* 3.14159265 radius radius))

(display "Area of radius 5 circle: ")
(display (circle-area 5))
(newline)

;; Return expression
(circle-area 5)
