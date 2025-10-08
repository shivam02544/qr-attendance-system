import LoadingSpinner from '../../components/shared/LoadingSpinner';

export default function StudentLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <LoadingSpinner 
        size="large" 
        message="Loading student dashboard..." 
      />
    </div>
  );
}