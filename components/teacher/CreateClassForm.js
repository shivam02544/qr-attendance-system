'use client';

import { useState, useEffect } from 'react';
import FormInput from '../shared/FormInput';
import Button from '../shared/Button';

export default function CreateClassForm({ onClose, onClassCreated, onError }) {
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    locationName: '',
    latitude: '',
    longitude: ''
  });
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      onError('Geolocation is not supported by this browser.');
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude.toString(),
          longitude: position.coords.longitude.toString()
        }));
        setGettingLocation(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        onError('Failed to get current location. Please enter coordinates manually.');
        setGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name.trim()) {
      onError('Class name is required.');
      return;
    }
    if (!formData.subject.trim()) {
      onError('Subject is required.');
      return;
    }
    if (!formData.locationName.trim()) {
      onError('Location name is required.');
      return;
    }
    if (!formData.latitude || !formData.longitude) {
      onError('Location coordinates are required.');
      return;
    }

    const lat = parseFloat(formData.latitude);
    const lng = parseFloat(formData.longitude);
    
    if (isNaN(lat) || lat < -90 || lat > 90) {
      onError('Please enter a valid latitude between -90 and 90.');
      return;
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      onError('Please enter a valid longitude between -180 and 180.');
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch('/api/teacher/classes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          subject: formData.subject.trim(),
          location: {
            name: formData.locationName.trim(),
            lat: lat,
            lng: lng
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create class');
      }

      const data = await response.json();
      onClassCreated(data.class);
    } catch (error) {
      console.error('Error creating class:', error);
      onError(error.message || 'Failed to create class. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Create New Class</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <FormInput
              label="Class Name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="e.g., Mathematics 101"
              required
            />

            <FormInput
              label="Subject"
              name="subject"
              type="text"
              value={formData.subject}
              onChange={handleInputChange}
              placeholder="e.g., Mathematics"
              required
            />

            <FormInput
              label="Location Name"
              name="locationName"
              type="text"
              value={formData.locationName}
              onChange={handleInputChange}
              placeholder="e.g., Room 101, Building A"
              required
            />

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Location Coordinates
              </label>
              <div className="flex space-x-2">
                <FormInput
                  label="Latitude"
                  name="latitude"
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={handleInputChange}
                  placeholder="e.g., 40.7128"
                  required
                  className="flex-1"
                />
                <FormInput
                  label="Longitude"
                  name="longitude"
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={handleInputChange}
                  placeholder="e.g., -74.0060"
                  required
                  className="flex-1"
                />
              </div>
              <button
                type="button"
                onClick={getCurrentLocation}
                disabled={gettingLocation}
                className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
              >
                {gettingLocation ? 'Getting location...' : 'Use current location'}
              </button>
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={loading}
                className="flex-1"
              >
                Create Class
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}