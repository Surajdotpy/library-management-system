import type { Request, Response } from 'express';
import * as studentService from './students.service.js';

// GET /api/students - Get all students
export async function getStudents(req: Request, res: Response) {
  try {
    const students = await studentService.getAllStudents();
    
    res.status(200).json({
      success: true,
      count: students.length,
      data: students
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch students'
    });
  }
}

// GET /api/students/:id - Get single student by ID
export async function getStudent(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id as string);  // ← FIXED
    
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid student ID'
      });
    }
    
    const student = await studentService.getStudentById(id);
    
    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: student
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch student'
    });
  }
}

// POST /api/students - Create new student
export async function createStudent(req: Request, res: Response) {
  try {
    const studentData = req.body;
    
    // Basic validation
    if (!studentData.name || !studentData.phone || !studentData.branch_id || !studentData.study_plan) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, phone, branch_id, study_plan'
      });
    }
    
    const newStudent = await studentService.createStudent(studentData);
    
    res.status(201).json({
      success: true,
      message: 'Student created successfully',
      data: newStudent
    });
  } catch (error) {
    console.error('Create student error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create student'
    });
  }
}

// PUT /api/students/:id - Update existing student
export async function updateStudent(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id as string);  // ← FIXED
    const updateData = req.body;
    
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid student ID'
      });
    }
    
    // Check if at least one field to update
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }
    
    const updatedStudent = await studentService.updateStudent(id, updateData);
    
    if (!updatedStudent) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Student updated successfully',
      data: updatedStudent
    });
  } catch (error) {
    console.error('Update student error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update student'
    });
  }
}

// DELETE /api/students/:id - Delete student (soft delete)
export async function deleteStudent(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id as string);  // ← FIXED
    
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid student ID'
      });
    }
    
    const deleted = await studentService.deleteStudent(id);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Student not found or already deleted'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Student deleted successfully'
    });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete student'
    });
  }
}