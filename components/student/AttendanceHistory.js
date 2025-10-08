'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, MapPin, TrendingUp, BarChart3, Download } from 'lucide-react';

export default function AttendanceHistory() {
    const [attendanceData, setAttendanceData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        classId: ''
    });
    const [enrolledClasses, setEnrolledClasses] = useState([]);
    const [activeTab, setActiveTab] = useState('history');

    const fetchEnrolledClasses = async () => {
        try {
            const response = await fetch('/api/student/enrolled');
            const data = await response.json();

            if (response.ok) {
                setEnrolledClasses(data.enrolledClasses || []);
            }
        } catch (err) {
            console.error('Error fetching enrolled classes:', err);
        }
    };

    const fetchAttendanceHistory = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const params = new URLSearchParams();
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);
            if (filters.classId) params.append('classId', filters.classId);

            const response = await fetch(`/api/student/attendance/history?${params}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch attendance history');
            }

            setAttendanceData(data.data);
        } catch (err) {
            console.error('Error fetching attendance history:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchEnrolledClasses();
    }, []);

    useEffect(() => {
        fetchAttendanceHistory();
    }, [fetchAttendanceHistory]);

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleExport = async () => {
        try {
            const params = new URLSearchParams();
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);
            if (filters.classId) params.append('classId', filters.classId);
            params.append('format', 'csv');

            const response = await fetch(`/api/student/attendance/history?${params}`);

            if (!response.ok) {
                throw new Error('Failed to export attendance history');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `my-attendance-history-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            console.error('Error exporting attendance history:', err);
            setError('Failed to export attendance history');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Loading attendance history...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header and Filters */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2 sm:mb-0">
                        My Attendance History
                    </h2>
                    <button
                        onClick={handleExport}
                        className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Export CSV
                    </button>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Class
                        </label>
                        <select
                            value={filters.classId}
                            onChange={(e) => handleFilterChange('classId', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">All Classes</option>
                            {enrolledClasses.map((enrollment) => (
                                <option key={enrollment.class._id} value={enrollment.class._id}>
                                    {enrollment.class.name} - {enrollment.class.subject}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Start Date
                        </label>
                        <input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => handleFilterChange('startDate', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            End Date
                        </label>
                        <input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => handleFilterChange('endDate', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-600">{error}</p>
                    <button
                        onClick={fetchAttendanceHistory}
                        className="mt-2 text-red-600 hover:text-red-800 underline"
                    >
                        Try again
                    </button>
                </div>
            )}

            {attendanceData && (
                <>
                    {/* Summary Statistics */}
                    {attendanceData.summary && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white rounded-lg shadow-sm border p-6">
                                <div className="flex items-center">
                                    <Calendar className="w-8 h-8 text-blue-600" />
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-600">Total Classes</p>
                                        <p className="text-2xl font-bold text-gray-900">{attendanceData.summary.totalClasses}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-lg shadow-sm border p-6">
                                <div className="flex items-center">
                                    <TrendingUp className="w-8 h-8 text-green-600" />
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-600">Total Attendance</p>
                                        <p className="text-2xl font-bold text-gray-900">{attendanceData.summary.totalAttendance}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-lg shadow-sm border p-6">
                                <div className="flex items-center">
                                    <BarChart3 className="w-8 h-8 text-purple-600" />
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-600">Avg per Class</p>
                                        <p className="text-2xl font-bold text-gray-900">{attendanceData.summary.averageAttendancePerClass}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-lg shadow-sm border p-6">
                                <div className="flex items-center">
                                    <Clock className="w-8 h-8 text-orange-600" />
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-600">Most Active Class</p>
                                        <p className="text-lg font-bold text-gray-900">
                                            {attendanceData.summary.mostActiveClass?.className || 'N/A'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab Navigation */}
                    <div className="bg-white rounded-lg shadow-sm border">
                        <div className="border-b border-gray-200">
                            <nav className="flex space-x-8 px-6">
                                {['history', 'classes', 'patterns'].map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${activeTab === tab
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                            }`}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </nav>
                        </div>

                        <div className="p-6">
                            {activeTab === 'history' && <HistoryTab attendanceHistory={attendanceData.attendanceHistory} />}
                            {activeTab === 'classes' && <ClassesTab attendanceByClass={attendanceData.attendanceByClass} />}
                            {activeTab === 'patterns' && <PatternsTab patterns={attendanceData.patterns} />}
                        </div>
                    </div>
                </>
            )}

            {!attendanceData && !loading && !error && (
                <div className="text-center p-8 text-gray-500">
                    No attendance history available
                </div>
            )}
        </div>
    );
}

function HistoryTab({ attendanceHistory }) {
    if (!attendanceHistory || attendanceHistory.length === 0) {
        return (
            <div className="text-center p-8 text-gray-500">
                No attendance records found
            </div>
        );
    }

    return (
        <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Attendance</h3>

            <div className="space-y-4">
                {attendanceHistory.map((record) => (
                    <div key={record.id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex-1">
                                <h4 className="font-medium text-gray-900">{record.className}</h4>
                                <p className="text-sm text-gray-600">{record.subject}</p>
                                <div className="flex items-center mt-2 text-sm text-gray-500">
                                    <Calendar className="w-4 h-4 mr-1" />
                                    <span className="mr-4">
                                        {new Date(record.markedAt).toLocaleDateString()}
                                    </span>
                                    <Clock className="w-4 h-4 mr-1" />
                                    <span className="mr-4">
                                        {new Date(record.markedAt).toLocaleTimeString()}
                                    </span>
                                    {record.location && (
                                        <>
                                            <MapPin className="w-4 h-4 mr-1" />
                                            <span>
                                                {record.location.lat?.toFixed(4)}, {record.location.lng?.toFixed(4)}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="mt-2 sm:mt-0">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Present
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function ClassesTab({ attendanceByClass }) {
    if (!attendanceByClass || attendanceByClass.length === 0) {
        return (
            <div className="text-center p-8 text-gray-500">
                No class attendance data available
            </div>
        );
    }

    return (
        <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Attendance by Class</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {attendanceByClass.map((classData) => (
                    <div key={classData.classId} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h4 className="font-medium text-gray-900">{classData.className}</h4>
                                <p className="text-sm text-gray-600">{classData.subject}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-bold text-blue-600">{classData.attendanceCount}</p>
                                <p className="text-sm text-gray-500">sessions</p>
                            </div>
                        </div>

                        {classData.lastAttendance && (
                            <div className="text-sm text-gray-500">
                                <span className="font-medium">Last attended:</span>{' '}
                                {new Date(classData.lastAttendance).toLocaleDateString()}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function PatternsTab({ patterns }) {
    if (!patterns) {
        return (
            <div className="text-center p-8 text-gray-500">
                No pattern data available
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Attendance by Day of Week */}
            {patterns.attendanceByDayOfWeek && (
                <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Attendance by Day of Week</h4>
                    <div className="space-y-2">
                        {Object.entries(patterns.attendanceByDayOfWeek).map(([day, count]) => {
                            const maxCount = Math.max(...Object.values(patterns.attendanceByDayOfWeek));
                            return (
                                <div key={day} className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600 w-20">{day}</span>
                                    <div className="flex items-center flex-1 mx-4">
                                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-blue-600 h-2 rounded-full"
                                                style={{ width: `${maxCount > 0 ? (count / maxCount) * 100 : 0}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-sm text-gray-900 ml-2 w-8">{count}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Attendance by Hour */}
            {patterns.attendanceByHour && (
                <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Attendance by Hour</h4>
                    <div className="space-y-2">
                        {Object.entries(patterns.attendanceByHour)
                            .sort(([a], [b]) => parseInt(a) - parseInt(b))
                            .map(([hour, count]) => {
                                const maxCount = Math.max(...Object.values(patterns.attendanceByHour));
                                return (
                                    <div key={hour} className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600 w-16">{hour}:00</span>
                                        <div className="flex items-center flex-1 mx-4">
                                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-green-600 h-2 rounded-full"
                                                    style={{ width: `${maxCount > 0 ? (count / maxCount) * 100 : 0}%` }}
                                                ></div>
                                            </div>
                                            <span className="text-sm text-gray-900 ml-2 w-8">{count}</span>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                </div>
            )}

            {/* Additional Pattern Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Most Active Day</h4>
                    <p className="text-lg text-blue-600">{patterns.mostActiveDay || 'N/A'}</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Most Active Hour</h4>
                    <p className="text-lg text-blue-600">{patterns.mostActiveHour || 'N/A'}:00</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Attendance Frequency</h4>
                    <p className="text-lg text-blue-600">{patterns.attendanceFrequency || 'N/A'}</p>
                </div>
            </div>
        </div>
    );
}