import React, { useState } from "react";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer } from "../utils/animations";
import { reviews } from "../store/reviews";

function TestimonialsSection() {
  const pageSize = 3;
  const totalPages = Math.ceil(reviews.length / pageSize);

  const [page, setPage] = useState(0);

  const start = page * pageSize;
  const visibleReviews = reviews.slice(start, start + pageSize);

  const next = () => {
    setPage((prev) => (prev + 1) % totalPages);
  };

  const prev = () => {
    setPage((prev) => (prev - 1 + totalPages) % totalPages);
  };

  return (
    <motion.section
      className="testimonials"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      variants={staggerContainer}
    >
      <div className="testimonials__container">
        <motion.h2 className="testimonials__title" variants={fadeUp}>
          Hear from our Hosts.
        </motion.h2>

        <motion.div
          key={page}
          className="testimonials__grid"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          {visibleReviews.map((review, i) => (
            <motion.div
              key={review.id}
              className={`testimonial ${
                i === 1
                  ? "testimonial--featured"
                  : i === 0
                  ? "testimonial--left"
                  : "testimonial--right"
              }`}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
            >
              <div className="testimonial__stars">★★★★★</div>

              <p>"{review.text}"</p>

              <div className="testimonial__user">
                <img src={review.img} alt={review.author} />
                <div>
                  <strong>{review.author}</strong>
                  <span>{review.location}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <div className="testimonials__controls">
          <button onClick={prev}>&lt;</button>
          <span>{page + 1}</span>
          <button onClick={next}>&gt;</button>
        </div>

        <motion.div className="testimonials__trust" variants={fadeUp}>
          <div className="testimonials__avatars">
            {reviews.slice(0, 3).map((r) => (
              <img key={r.id} src={r.img} alt="" />
            ))}
          </div>
          <span>Many hosts trust Domits</span>
        </motion.div>
      </div>
    </motion.section>
  );
}

export default TestimonialsSection;