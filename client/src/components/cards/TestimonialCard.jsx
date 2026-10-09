import React from 'react';
import { Quote } from 'lucide-react';
import StarRating from '../common/StarRating';

const TestimonialCard = ({ testimonial }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col justify-between relative group">
      <div>
        {/* Quote Icon & Rating */}
        <div className="flex items-center justify-between mb-4">
          <div className="w-9 h-9 rounded-xl bg-orange-50 text-brand-accent flex items-center justify-center">
            <Quote className="w-4 h-4 fill-brand-accent" />
          </div>
          <StarRating rating={testimonial.rating} size="w-3.5 h-3.5" />
        </div>

        {/* Review Quote */}
        <p className="text-sm text-slate-700 leading-relaxed italic mb-6">
          "{testimonial.review}"
        </p>
      </div>

      {/* Author Details */}
      <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={testimonial.avatar}
            alt={testimonial.name}
            loading="lazy"
            className="w-10 h-10 rounded-full object-cover border border-slate-200"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-bold text-slate-900">
                {testimonial.name}
              </h4>
              <span className="text-[9px] font-semibold bg-slate-100 text-slate-500 px-1 py-0.2 rounded">
                Demo
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {testimonial.location}
            </p>
          </div>
        </div>

        {/* Service Tag */}
        <span className="text-[10px] font-semibold bg-orange-50 text-brand-accent px-2 py-1 rounded-lg">
          {testimonial.service}
        </span>
      </div>
    </div>
  );
};

export default TestimonialCard;

