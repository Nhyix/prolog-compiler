(define (subtotal carrito)
  (apply + (map (lambda (p) (* (cadr p) (caddr p))) carrito))
  )
  
;; (subtotal '(("leche" 120 2) ("pan" 80 3) ("queso" 200 1)))

(define (descuento-mayoreo t)
  (if (> t 500) 
      (* t 0.9) 
      t))

;; (descuento 700)

(define (iva t) 
  (* t 1.16))

(define (componer fs)
  (lambda (x)
    (if (null? fs)
        x
        ((componer (cdr fs)) ((car fs) x)))))

(define (total carrito)
  ((componer (list descuento-mayoreo iva)) (subtotal carrito)))
  ;iva(descuento-mayoreo(x))

(total '(("leche" 120 2) ("pan" 80 3) ("queso" 200 1)))