import React, { useState } from 'react';
import { MapPin, Briefcase, CheckCircle2, Info, X } from 'lucide-react';
import StarRating from '../common/StarRating';

const TechnicianCard = ({ technician }) => {
  const [showDemoModal, setShowDemoModal] = useState(false);

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-brand-accent/30 transition-all duration-200 flex flex-col justify-between relative group">
        
        {/* Top: Avatar, Verified Demo Badge, Rating */}
        <div>
          <div className="flex items-start gap-4">
            <div className="relative">
              <img
                src={technician.avatar}
                alt={technician.name}
                loading="lazy"
                className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-100 shadow-sm"
              />
              <span
                className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-0.5 rounded-full ring-2 ring-white"
                title="Fictional verified demo profile"
              >
                <CheckCircle2 className="w-4 h-4" />
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-base font-bold text-slate-900 truncate">
                  {technician.name}
                </h3>
                <span className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                  Demo
                </span>
              </div>
              <p className="text-xs text-brand-accent font-medium truncate mt-0.5">
                {technician.profession}
              </p>

              <div className="mt-1.5">
                <StarRating
                  rating={technician.rating}
                  showScore
                  reviewCount={technician.reviewCount}
                  size="w-3.5 h-3.5"
                />
              </div>
            </div>
          </div>

          {/* Experience & Location Badges */}
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span>{technician.experience} • {technician.completedJobs}+ jobs</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="truncate">{technician.location}</span>
            </div>
          </div>

          {/* Specialties Pills */}
          {technician.specialties && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {technician.specialties.map((spec) => (
                <span
                  key={spec}
                  className="text-[10px] font-medium bg-orange-50 text-brand-900 px-2 py-0.5 rounded-md"
                >
                  {spec}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Bottom: Starting Price & View Profile (Demo) */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-medium">Visiting Fee</span>
            <span className="text-base font-extrabold text-slate-900">
              Starts at <span className="text-brand-accent">{technician.startingPrice}</span>
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowDemoModal(true)}
            className="text-xs font-bold text-slate-700 hover:text-brand-accent bg-slate-100 hover:bg-orange-50 px-3.5 py-2 rounded-xl transition-colors"
          >
            View Profile
          </button>
        </div>
      </div>

      {/* Demo Profile Modal */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative border border-slate-200 animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setShowDemoModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <img
                src={technician.avatar}
                alt={technician.name}
                className="w-14 h-14 rounded-xl object-cover"
              />
              <div>
                <h4 className="text-lg font-bold text-slate-900">{technician.name}</h4>
                <p className="text-xs text-brand-accent font-medium">{technician.profession}</p>
                <div className="mt-1">
                  <StarRating rating={technician.rating} showScore reviewCount={technician.reviewCount} />
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex gap-2.5 items-start mb-4">
              <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>UI Simulation Note:</strong> This is a fictional demo profile for Phase 2 interface visualization. Technician onboarding, live GPS tracking, and direct booking will be implemented in subsequent phases.
              </span>
            </div>

            <div className="space-y-2 text-xs text-slate-600 mb-6">
              <p><strong>Operating Area:</strong> {technician.location}</p>
              <p><strong>Field Experience:</strong> {technician.experience}</p>
              <p><strong>Completed Bookings:</strong> {technician.completedJobs} verified visits</p>
            </div>

            <button
              onClick={() => setShowDemoModal(false)}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs py-2.5 rounded-xl transition-colors"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default TechnicianCard;

