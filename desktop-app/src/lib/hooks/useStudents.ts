import { useState, useEffect } from 'react';
import { studentsApi } from '@/lib/api';
import type { Student } from '@/types';

export function useStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all students
  const fetchStudents = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await studentsApi.getAll();
      setStudents(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load students');
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  };

  // Create student
  const createStudent = async (studentData: any) => {
    try {
      const newStudent = await studentsApi.create(studentData);
      setStudents(prev => [...prev, newStudent]);
      return { success: true, student: newStudent };
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to create student';
      return { success: false, error: errorMessage };
    }
  };

  // Update student
  const updateStudent = async (id: number, studentData: any) => {
    try {
      const updatedStudent = await studentsApi.update(id, studentData);
      setStudents(prev => prev.map(s => s.id === id ? updatedStudent : s));
      return { success: true, student: updatedStudent };
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to update student';
      return { success: false, error: errorMessage };
    }
  };

  // Delete student
  const deleteStudent = async (id: number) => {
    try {
      await studentsApi.delete(id);
      setStudents(prev => prev.filter(s => s.id !== id));
      return { success: true };
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to delete student';
      return { success: false, error: errorMessage };
    }
  };

  // Load students on mount
  useEffect(() => {
    fetchStudents();
  }, []);

  return {
    students,
    loading,
    error,
    fetchStudents,
    createStudent,
    updateStudent,
    deleteStudent,
  };
}