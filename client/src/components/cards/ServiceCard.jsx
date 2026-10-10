import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Zap, 
  Wrench, 
  Sparkles, 
  Paintbrush, 
  Wind, 
  Hammer, 
  Tv, 
  ShieldAlert, 
  Clock, 
  ArrowRight,
  Star
} from 'lucide-react';

const iconMap = {
  Zap,
  Wrench,
  Sparkles,
  Paintbrush,
  Wind,
  Hammer,
  Tv,
  ShieldAlert,
};

const FALLBACK_CATEGORY_IMAGES = {
  'AC': '/images/service-ac.jpg',
  'AC Repair': '/images/service-ac.jpg',
  'Electrical': '/images/hero-electrician.jpg',
  'Plumbing': '/images/service-plumbing.jpg',
  'Cleaning': '/images/hero-cleaner.jpg',
  'Painting': 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=800&q=80',
  'Carpentry': 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80',
  'Appliance Repair': 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
  'Pest Control': 'https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?auto=format&fit=crop&w=800&q=80',
  DEFAULT: '/images/service-ac.jpg',
};

const getServiceImage = (service) => {
  if (service?.image && typeof service.image === 'string' && service.image.trim() !== '') {
    return service.image;
  }
  const cat = service?.category || '';
  return FALLBACK_CATEGORY_IMAGES[cat] || FALLBACK_CATEGORY_IMAGES.DEFAULT;
};

const ServiceCard = ({ service, compact = false }) => {
  const IconComponent = iconMap[service.iconName] || Sparkles;
  const serviceSlug = service.slug || service.id || service._id;
  const formattedPrice =
    typeof service.startingPrice === 'number'
      ? `₹${service.startingPrice}`
      : service.startingPrice;

  if (compact) {
    return (
      <Link
        to={`/services/${serviceSlug}`}
        className="group bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-brand-accent/40 transition-all duration-200 flex flex-col justify-between"
      >
        <div>
          <div className="w-12 h-12 rounded-xl bg-orange-50 text-brand-accent flex items-center justify-center mb-4 group-hover:scale-105 group-hover:bg-brand-accent group-hover:text-white transition-all duration-200">
            <IconComponent className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900 text-base mb-1 group-hover:text-brand-accent transition-colors">
            {service.name}
          </h3>
          <p className="text-xs text-slate-500 mb-4 line-clamp-2 leading-relaxed">
            {service.shortDesc}
          </p>
        </div>
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-900">
            From <span className="text-brand-accent">{formattedPrice}</span>
          </span>
          <span className="text-xs font-semibold text-brand-accent group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
            Explore <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </Link>
    );
  }

  return (
    <div className="group bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg hover:border-brand-accent/30 transition-all duration-300 flex flex-col">
      {/* Thumbnail with overlay & icon badge */}
      <div className="relative h-48 w-full overflow-hidden bg-slate-100">
        <img
          src={getServiceImage(service)}
          alt={service.name}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.onerror = null;
            const fallback = FALLBACK_CATEGORY_IMAGES[service?.category] || FALLBACK_CATEGORY_IMAGES.DEFAULT;
            if (e.currentTarget.src !== fallback) {
              e.currentTarget.src = fallback;
            }
          }}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
        
        {/* Category tag */}
        <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-md text-slate-900 text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-sm">
          {service.category}
        </span>

        {/* Rating Badge */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-black/60 backdrop-blur-md text-white text-xs font-semibold px-2.5 py-1 rounded-lg">
          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span>{service.rating}</span>
          <span className="text-white/60 text-[10px]">({service.reviewCount})</span>
        </div>

        {/* Duration Badge */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/60 backdrop-blur-md text-white text-xs font-medium px-2.5 py-1 rounded-lg">
          <Clock className="w-3.5 h-3.5 text-slate-300" />
          <span>{service.duration}</span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 group-hover:text-brand-accent transition-colors leading-snug">
            {service.name}
          </h3>
          <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
            {service.shortDesc}
          </p>
        </div>

        {/* Inclusions summary pills */}
        {service.whatsIncluded && (
          <div className="space-y-1.5 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
            <p className="text-slate-400 font-medium">Includes:</p>
            <p className="truncate text-slate-700">✓ {service.whatsIncluded[0]}</p>
            <p className="truncate text-slate-700">✓ {service.whatsIncluded[1]}</p>
          </div>
        )}

        {/* Pricing & CTA */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 block uppercase font-medium">Starting from</span>
            <span className="text-lg font-extrabold text-slate-900">
              <span className="text-brand-accent">{formattedPrice}</span>
            </span>
          </div>

          <Link
            to={`/services/${serviceSlug}`}
            className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-brand-accent text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all duration-200 shadow-sm"
          >
            <span>Explore</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ServiceCard;

