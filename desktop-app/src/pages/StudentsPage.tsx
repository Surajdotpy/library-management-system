import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/Card';
import { studentsApi } from '@/lib/api';
import { Users, Loader2 } from 'lucide-react';
import type { Student } from '@/types';

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const data = await studentsApi.getAll();
      setStudents(data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-purple-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Students Management</h1>
            <p className="text-gray-600">{students.length} total students</p>
          </div>
        </div>

        {loading && (
          <Card>
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
              <span className="ml-3">Loading...</span>
            </div>
          </Card>
        )}

        {error && (
          <Card>
            <div className="text-red-600">{error}</div>
          </Card>
        )}

        {!loading && students.length === 0 && (
          <Card>
            <div className="text-center py-12">
              <p className="text-gray-600">No students found</p>
            </div>
          </Card>
        )}

        {!loading && students.length > 0 && (
          <Card>
            <div className="space-y-4">
              {students.map(student => (
                <div key={student.id} className="p-4 border border-gray-200 rounded-lg">
                  <p className="font-bold">{student.name}</p>
                  <p className="text-sm text-gray-600">{student.student_id}</p>
                  <p className="text-sm">{student.phone}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

      </div>
    </MainLayout>
  );
}