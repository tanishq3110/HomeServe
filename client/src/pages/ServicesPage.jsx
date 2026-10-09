import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, Sparkles, X, RefreshCw, AlertCircle } from 'lucide-react';
import { serviceService } from '../services/api';
import ServiceCard from '../components/cards/ServiceCard';
import SectionHeading from '../components/common/SectionHeading';
import SkeletonLoader from '../components/common/SkeletonLoader';
import ErrorState from '../components/common/ErrorState';
import EmptyState from '../components/common/EmptyState';

const categories = [
  'All',
  'Electrical',
  'Plumbing',
  'Cleaning',
  'Painting',
  'AC Repair',
  'Carpentry',
  'Appliance Repair',
  'Pest Control',
];

const ServicesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCategory = searchParams.get('category') || 'All';
  const initialQuery = searchParams.get('search') || '';

  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState(initialQuery);

  // Live MongoDB services state
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sync state with URL if user navigates back/forward
  useEffect(() => {
    const cat = searchParams.get('category') || 'All';
    const q = searchParams.get('search') || '';
    setSelectedCategory(cat);
    setSearchQuery(q);
  }, [searchParams]);

  // Fetch services from MongoDB API
  const fetchServices = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = {};
    if (selectedCategory && selectedCategory !== 'All') {
      params.category = selectedCategory;
    }
    if (searchQuery && searchQuery.trim()) {
      params.search = searchQuery.trim();
    }

    try {
      const res = await serviceService.getAll(params);
      setServices(res.data || []);
    } catch (err) {
      console.error('[ServicesPage Error]', err);
      setError(err.message || 'Failed to load services from the server.');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchQuery]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    const newParams = new URLSearchParams(searchParams);
    if (category === 'All') {
      newParams.delete('category');
    } else {
      newParams.set('category', category);
    }
    setSearchParams(newParams);
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    const newParams = new URLSearchParams(searchParams);
    if (!val.trim()) {
      newParams.delete('search');
    } else {
      newParams.set('search', val);
    }
    setSearchParams(newParams);
  };

  const resetFilters = () => {
    setSelectedCategory('All');
    setSearchQuery('');
    setSearchParams({});
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      
      {/* Header Banner */}
      <div className="bg-dark-hero text-white pt-12 pb-16 px-4 sm:px-6 lg:px-8 border-b border-white/10 relative overflow-hidden">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-brand-accent/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto space-y-6 relative z-10">
          <SectionHeading
            badge="Service Marketplace"
            title="Find the Right Service"
            highlight="for Your Home"
            subtitle="Browse verified home professionals across repair, maintenance, cleaning, and renovation."
            dark
            align="center"
          />

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto pt-2">
            <div className="bg-white rounded-2xl p-2 shadow-2xl flex items-center gap-2 border border-slate-200">
              <div className="flex items-center gap-3 pl-3 flex-1">
                <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Search service by name or keyword (e.g., AC, Leak, Sofa)..."
                  className="w-full text-slate-800 placeholder-slate-400 bg-transparent text-sm focus:outline-none"
                />
              </div>

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    const newParams = new URLSearchParams(searchParams);
                    newParams.delete('search');
                    setSearchParams(newParams);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={fetchServices}
                className="bg-brand-accent hover:bg-brand-600 text-white font-bold text-xs sm:text-sm px-5 py-3 rounded-xl transition-colors shadow-sm cursor-pointer"
              >
                Search
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        
        {/* Category Filter Pills Card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 mb-8 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max pb-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 pr-2 border-r border-slate-200">
              <SlidersHorizontal className="w-3.5 h-3.5 text-brand-accent" />
              Categories
            </span>

            {categories.map((cat) => {
              const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
              return (
                <button
                  key={cat}
                  onClick={() => handleCategorySelect(cat)}
                  className={`text-xs font-semibold px-4 py-2 rounded-xl transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'bg-brand-accent text-white shadow-sm shadow-orange-500/20'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Results Bar */}
        <div className="flex items-center justify-between mb-6 text-sm text-slate-600">
          <div>
            Showing <strong className="text-slate-900">{services.length}</strong> services
            {selectedCategory !== 'All' && (
              <span> in <strong className="text-brand-accent">{selectedCategory}</strong></span>
            )}
            {searchQuery && (
              <span> matching "<strong className="text-slate-900">{searchQuery}</strong>"</span>
            )}
          </div>

          {(selectedCategory !== 'All' || searchQuery) && (
            <button
              onClick={resetFilters}
              className="text-xs font-bold text-brand-accent hover:text-brand-700 underline cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Loading State Skeletons */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <SkeletonLoader variant="card" count={8} />
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <ErrorState
            title="Unable to load services"
            message={error}
            onRetry={fetchServices}
            retryLabel="Retry Request"
          />
        )}

        {/* Services Grid (Successful Results) */}
        {!loading && !error && services.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {services.map((service) => (
              <ServiceCard key={service._id || service.slug} service={service} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && services.length === 0 && (
          <EmptyState
            icon={Search}
            title="No matching services found"
            description="We couldn't find any active services matching your query. Try adjusting your search term or category filters."
            actionLabel="View All Services"
            onAction={resetFilters}
          />
        )}

      </div>
    </div>
  );
};

export default ServicesPage;
