'use client';

import { useState } from 'react';
import ResponsiveLayout, { ResponsiveCard, ResponsiveGrid } from '../../components/shared/ResponsiveLayout';
import DashboardStats, { StatConfigs } from '../../components/shared/DashboardStats';
import ResponsiveTable, { ColumnTypes } from '../../components/shared/ResponsiveTable';
import ResponsiveForm, { FieldTypes } from '../../components/shared/ResponsiveForm';
import ResponsiveModal, { ConfirmModal, InfoModal } from '../../components/shared/ResponsiveModal';
import BrowserCompatibility from '../../components/shared/BrowserCompatibility';
import QRScanner from '../../components/student/QRScanner';
import QRGenerator from '../../components/teacher/QRGenerator';

export default function TestResponsivePage() {
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showQRGenerator, setShowQRGenerator] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Mock data for testing
  const mockStats = [
    { ...StatConfigs.classes, value: 12 },
    { ...StatConfigs.students, value: 245, trend: { direction: 'up', value: '+12%' } },
    { ...StatConfigs.attendance, value: '87%', trend: { direction: 'down', value: '-3%' } }
  ];

  const mockTableData = [
    { id: 1, name: 'John Doe', email: 'john@example.com', status: 'active', lastSeen: new Date() },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', status: 'inactive', lastSeen: new Date() },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', status: 'active', lastSeen: new Date() }
  ];

  const tableColumns = [
    ColumnTypes.text('name', 'Name'),
    ColumnTypes.text('email', 'Email'),
    ColumnTypes.status('status', 'Status', {
      active: { color: 'green', label: 'Active' },
      inactive: { color: 'red', label: 'Inactive' }
    }),
    ColumnTypes.date('lastSeen', 'Last Seen', { format: 'short' }),
    ColumnTypes.actions('Actions', [
      { label: 'Edit', onClick: (row) => console.log('Edit', row), className: 'text-blue-600 hover:text-blue-800' },
      { label: 'Delete', onClick: (row) => console.log('Delete', row), className: 'text-red-600 hover:text-red-800' }
    ])
  ];

  const formFields = [
    FieldTypes.text('name', 'Full Name', { required: true, placeholder: 'Enter your full name' }),
    FieldTypes.email('email', 'Email Address', { required: true }),
    FieldTypes.select('role', 'Role', [
      { value: 'student', label: 'Student' },
      { value: 'teacher', label: 'Teacher' },
      { value: 'admin', label: 'Admin' }
    ], { required: true }),
    FieldTypes.textarea('bio', 'Bio', { placeholder: 'Tell us about yourself...' }),
    FieldTypes.checkbox('terms', 'I agree to the terms and conditions', { required: true })
  ];

  const actions = [
    {
      label: 'QR Scanner',
      onClick: () => setShowQRScanner(true),
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
        </svg>
      ),
      className: 'bg-blue-600 hover:bg-blue-700 text-white'
    },
    {
      label: 'QR Generator',
      onClick: () => setShowQRGenerator(true),
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
      className: 'bg-green-600 hover:bg-green-700 text-white'
    }
  ];

  const handleFormSubmit = (data) => {
    console.log('Form submitted:', data);
    setShowForm(false);
  };

  return (
    <ResponsiveLayout
      title="Responsive Design Test"
      user={{ name: 'Test User' }}
      onLogout={() => console.log('Logout')}
      actions={actions}
    >
      {/* Browser Compatibility Check */}
      <div className="mb-6">
        <BrowserCompatibility />
      </div>

      {/* Dashboard Stats */}
      <DashboardStats stats={mockStats} />

      {/* Action Buttons Grid */}
      <ResponsiveGrid cols={2} className="mb-8">
        <ResponsiveCard>
          <h3 className="text-lg font-semibold mb-4">Modals & Forms</h3>
          <div className="space-y-3">
            <button
              onClick={() => setShowModal(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              Show Modal
            </button>
            <button
              onClick={() => setShowConfirmModal(true)}
              className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              Show Confirm Modal
            </button>
            <button
              onClick={() => setShowInfoModal(true)}
              className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              Show Info Modal
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              Show Form
            </button>
          </div>
        </ResponsiveCard>

        <ResponsiveCard>
          <h3 className="text-lg font-semibold mb-4">QR Code Features</h3>
          <div className="space-y-3">
            <button
              onClick={() => setShowQRScanner(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              Test QR Scanner
            </button>
            <button
              onClick={() => setShowQRGenerator(true)}
              className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              Test QR Generator
            </button>
          </div>
        </ResponsiveCard>
      </ResponsiveGrid>

      {/* Responsive Table */}
      <ResponsiveCard className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Responsive Table</h3>
        <ResponsiveTable
          data={mockTableData}
          columns={tableColumns}
          onRowClick={(row) => console.log('Row clicked:', row)}
        />
      </ResponsiveCard>

      {/* Screen Size Info */}
      <ResponsiveCard>
        <h3 className="text-lg font-semibold mb-4">Responsive Breakpoints</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div className="p-3 bg-gray-100 rounded">
            <div className="font-medium">Mobile</div>
            <div className="text-gray-600">&lt; 640px</div>
            <div className="block sm:hidden text-green-600 font-medium">Active</div>
          </div>
          <div className="p-3 bg-gray-100 rounded">
            <div className="font-medium">Tablet</div>
            <div className="text-gray-600">640px - 1024px</div>
            <div className="hidden sm:block lg:hidden text-green-600 font-medium">Active</div>
          </div>
          <div className="p-3 bg-gray-100 rounded">
            <div className="font-medium">Desktop</div>
            <div className="text-gray-600">1024px - 1280px</div>
            <div className="hidden lg:block xl:hidden text-green-600 font-medium">Active</div>
          </div>
          <div className="p-3 bg-gray-100 rounded">
            <div className="font-medium">Large</div>
            <div className="text-gray-600">&gt; 1280px</div>
            <div className="hidden xl:block text-green-600 font-medium">Active</div>
          </div>
        </div>
      </ResponsiveCard>

      {/* Modals */}
      <ResponsiveModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Test Modal"
        size="default"
      >
        <p className="text-gray-600 mb-4">
          This is a test modal to demonstrate responsive behavior across different screen sizes.
        </p>
        <div className="flex justify-end">
          <button
            onClick={() => setShowModal(false)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </ResponsiveModal>

      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={() => {
          console.log('Confirmed');
          setShowConfirmModal(false);
        }}
        title="Confirm Action"
        message="Are you sure you want to perform this action?"
        type="danger"
      />

      <InfoModal
        isOpen={showInfoModal}
        onClose={() => setShowInfoModal(false)}
        title="Information"
        message="This is an informational message to test the info modal component."
        type="success"
      />

      {/* Form Modal */}
      <ResponsiveModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Test Form"
        size="large"
      >
        <ResponsiveForm
          fields={formFields}
          onSubmit={handleFormSubmit}
          onCancel={() => setShowForm(false)}
          submitLabel="Save"
          layout="grid"
        />
      </ResponsiveModal>

      {/* QR Scanner */}
      {showQRScanner && (
        <QRScanner
          onScanSuccess={(result) => {
            console.log('QR Scan Success:', result);
            setShowQRScanner(false);
          }}
          onClose={() => setShowQRScanner(false)}
        />
      )}

      {/* QR Generator */}
      {showQRGenerator && (
        <ResponsiveModal
          isOpen={showQRGenerator}
          onClose={() => setShowQRGenerator(false)}
          title="QR Code Generator Test"
          size="large"
        >
          <QRGenerator
            classId="test-class-id"
            className="Test Class"
            onSessionStart={(session) => console.log('Session started:', session)}
            onSessionEnd={() => console.log('Session ended')}
            onSessionExtend={(session) => console.log('Session extended:', session)}
          />
        </ResponsiveModal>
      )}
    </ResponsiveLayout>
  );
}