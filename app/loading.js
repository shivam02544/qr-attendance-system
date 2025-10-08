import LoadingSpinner from '../components/shared/LoadingSpinner';

export default function Loading() {
  return (
    <LoadingSpinner 
      size="large" 
      message="Loading application..." 
      fullScreen={true}
    />
  );
}