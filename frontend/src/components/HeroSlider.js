import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const DEFAULT_SLIDES = [
  {
    image: '/images/hero1.webp',
    alt: 'Luxury bedding on a modern bedroom setup',
    title: 'Elevate Every Room With Boutique-Style Bedding',
    subtitle: 'Discover premium textures, artisan details, and timeless comfort curated for modern homes.'
  },
  {
    image: '/images/hero2.webp',
    alt: 'Warm neutral bedroom with layered textiles',
    title: 'Crafted Layers. Signature Comfort.',
    subtitle: 'From breathable bedsheets to cozy blankets, build a bedroom that feels effortlessly luxurious.'
  },
  {
    image: '/images/hero3.webp',
    alt: 'Premium interior with soft bedding and sunlight',
    title: 'Modern Living, Styled To Perfection',
    subtitle: 'Bring calm, warmth, and elegance to your home with premium eCommerce-ready essentials.'
  },
  {
    image: '/images/hero4.webp',
    alt: 'Elegant bedroom decor with cozy fabric textures',
    title: 'Where Comfort Meets Luxury',
    subtitle: 'Designed for everyday indulgence with refined materials, rich color palettes, and elevated finishing.'
  }
];

const AUTO_SLIDE_MS = 4000;
const ANIMATION_DURATION = 1.2;

const slideVariants = {
  enter: () => ({
    opacity: 0,
    x: '8%',
    scale: 1.2
  }),
  center: {
    opacity: 1,
    x: 0,
    scale: 1
  },
  exit: () => ({
    opacity: 0,
    x: '-8%',
    scale: 1.05
  })
};

const textVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.75,
      ease: [0.22, 1, 0.36, 1],
      delayChildren: 0.2,
      staggerChildren: 0.11
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.22, 1, 0.22, 1] }
  }
};

const HeroSlider = ({
  slides = DEFAULT_SLIDES,
  eyebrow = 'New Season Collection',
  title = '',
  subtitle = '',
  primaryCta = { label: 'Shop Collection', to: '/products' },
  secondaryCta = { label: 'Explore Best Sellers', to: '/products?sort=trending' },
  showArrows = true
}) => {
  const safeSlides = useMemo(
    () => (Array.isArray(slides) && slides.length > 0 ? slides : DEFAULT_SLIDES),
    [slides]
  );
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (safeSlides.length <= 1) return undefined;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % safeSlides.length);
    }, AUTO_SLIDE_MS);

    return () => window.clearInterval(timer);
  }, [safeSlides.length]);

  const goToSlide = (nextIndex) => {
    if (nextIndex === activeIndex) return;
    setActiveIndex(nextIndex);
  };

  const handlePrev = () => {
    setActiveIndex((current) => (current - 1 + safeSlides.length) % safeSlides.length);
  };

  const handleNext = () => {
    setActiveIndex((current) => (current + 1) % safeSlides.length);
  };

  const currentSlide = safeSlides[activeIndex];
  const currentTitle = currentSlide?.title || title || DEFAULT_SLIDES[0].title;
  const currentSubtitle = currentSlide?.subtitle || subtitle || DEFAULT_SLIDES[0].subtitle;

  return (
    <section className="relative h-[100vh] min-h-[80vh] w-full overflow-hidden bg-black text-white">
      <div className="relative h-full w-full overflow-hidden">
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={activeIndex}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: ANIMATION_DURATION, ease: [0.24, 0.2, 0.2, 1           ] }}
            className="absolute inset-0 will-change-transform"
            style={{
              backgroundImage: `url(${currentSlide.image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
            aria-label={currentSlide.alt}
          >
            <div className="absolute inset-0 bg-black/30" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/20 to-black/60" />
          </motion.div>
        </AnimatePresence>

        <div className="absolute inset-0 flex items-center justify-center px-4 sm:px-8 lg:px-12">
          <motion.div
            key={`${activeIndex}-content`}
            variants={textVariants}
            initial="hidden"
            animate="visible"
            className="relative z-10 mx-auto w-full max-w-5xl text-center"
          >
            <motion.p variants={itemVariants} className="mx-auto mb-5 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/90 backdrop-blur-md sm:text-xs">
              {eyebrow}
            </motion.p>
            <motion.h1
              variants={itemVariants}
              className="mx-auto max-w-4xl text-[2.3rem] font-semibold leading-[0.98] tracking-tight text-white sm:text-[3.2rem] lg:text-[4.8rem]"
            >
              {currentTitle}
            </motion.h1>
            <motion.p
              variants={itemVariants}
              className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/85 sm:text-lg lg:text-xl"
            >
              {currentSubtitle}
            </motion.p>
            <motion.div variants={itemVariants} className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link
                to={primaryCta.to}
                className="inline-flex items-center justify-center rounded-full bg-[#f4bf89] px-6 py-3 text-sm font-bold text-[#24180f] shadow-[0_16px_30px_rgba(0,0,0,0.22)] transition-transform duration-300 hover:scale-[1.03] hover:bg-[#f6c89b] sm:px-8 sm:py-3.5 sm:text-base"
              >
                {primaryCta.label}
              </Link>
              <Link
                to={secondaryCta.to}
                className="inline-flex items-center justify-center rounded-full border border-white/25 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-md transition-transform duration-300 hover:scale-[1.03] hover:bg-white/15 sm:px-8 sm:py-3.5 sm:text-base"
              >
                {secondaryCta.label}
              </Link>
            </motion.div>
          </motion.div>
        </div>

        <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/15 bg-black/20 px-3 py-2 backdrop-blur-md">
          {safeSlides.map((slide, index) => (
            <button
              key={slide.image || index}
              type="button"
              onClick={() => goToSlide(index)}
              className={`h-2.5 rounded-full transition-all duration-300 ${index === activeIndex ? 'w-8 bg-[#f4bf89]' : 'w-2.5 bg-white/45 hover:bg-white/75'}`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        {showArrows && safeSlides.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous slide"
              className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/20 bg-black/25 p-3 text-white backdrop-blur-md transition-transform duration-300 hover:scale-110 hover:bg-black/40 sm:left-6"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next slide"
              className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/20 bg-black/25 p-3 text-white backdrop-blur-md transition-transform duration-300 hover:scale-110 hover:bg-black/40 sm:right-6"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          </>
        )}
      </div>
    </section>
  );
};

export default HeroSlider;
