import type { Response } from 'express';
import type { AuthRequest } from '../auth/auth.types.ts';
import type { CreateStudentDTO } from './students.types.ts';
import * as studentService from './students.service.ts';
import {
  isAuthorizationError,
  requireAuthenticatedUser,
  resolveAuthorizedBranchId,
} from '../auth/auth.authorization.ts';

const VALID_STUDY_PLANS = new Set(['2_hours', '4_hours', 'unlimited']);
const VALID_GENDERS = new Set(['male', 'female', 'other']);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function badRequest(res: Response, error: string) {
  return res.status(400).json({
    success: false,
    error,
  });
}

function parseBranchId(value: unknown): number | undefined {
  if (typeof value !== 'string' || value.trim() === '') {
    return undefined;
  }

  const parsedValue = Number.parseInt(value, 10);
  return Number.isNaN(parsedValue) ? Number.NaN : parsedValue;
}

function parseIncludeInactive(value: unknown): boolean | undefined {
  if (typeof value !== 'string' || value.trim() === '') {
    return undefined;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (normalizedValue === 'true' || normalizedValue === '1') {
    return true;
  }

  if (normalizedValue === 'false' || normalizedValue === '0') {
    return false;
  }

  return undefined;
}

// GET /api/students - Get all students
export async function getStudents(req: AuthRequest, res: Response) {
  try {
    const user = requireAuthenticatedUser(req.user);
    const requestedBranchId = parseBranchId(req.query.branch_id);
    const includeInactive = parseIncludeInactive(req.query.include_inactive);

    if (Number.isNaN(requestedBranchId)) {
      return badRequest(res, 'Invalid branch ID');
    }

    if (
      req.query.include_inactive != null &&
      includeInactive == null
    ) {
      return badRequest(res, 'Invalid include_inactive value');
    }

    const branchId = resolveAuthorizedBranchId(user, requestedBranchId);
    const students = await studentService.getAllStudents(
      branchId,
      includeInactive ?? false,
    );

    res.status(200).json({
      success: true,
      count: students.length,
      data: students,
    });
  } catch (error) {
    if (isAuthorizationError(error)) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch students',
    });
  }
}

// GET /api/students/:id - Get single student by ID
export async function getStudent(req: AuthRequest, res: Response) {
  try {
    const id = Number.parseInt(req.params.id as string, 10);

    if (Number.isNaN(id)) {
      return badRequest(res, 'Invalid student ID');
    }

    const user = requireAuthenticatedUser(req.user);
    const branchId = resolveAuthorizedBranchId(user);
    const student = await studentService.getStudentById(id, branchId);

    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found',
      });
    }

    res.status(200).json({
      success: true,
      data: student,
    });
  } catch (error) {
    if (isAuthorizationError(error)) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch student',
    });
  }
}

// POST /api/students - Create new student
export async function createStudent(req: AuthRequest, res: Response) {
  try {
    const user = requireAuthenticatedUser(req.user);
    const {
      name,
      phone,
      email,
      study_plan,
      branch_id,
      date_of_birth,
      gender,
      blood_group,
      address,
      city,
      state,
      pincode,
      emergency_contact_name,
      emergency_contact_phone,
      emergency_contact_relation,
      id_proof_type,
      id_proof_number,
    } = req.body as Partial<CreateStudentDTO>;

    const requestedBranchId =
      typeof branch_id === 'string' ? Number.parseInt(branch_id, 10) : branch_id;
    const normalizedEmail = email?.trim();

    if (!name?.trim()) {
      return badRequest(res, 'Name is required');
    }

    if (!phone?.trim()) {
      return badRequest(res, 'Phone is required');
    }

    if (!/^\d{10}$/.test(phone.trim())) {
      return badRequest(res, 'Phone must be 10 digits');
    }

    if (!study_plan) {
      return badRequest(res, 'Study plan is required');
    }

    if (!VALID_STUDY_PLANS.has(study_plan)) {
      return badRequest(res, 'Invalid study plan');
    }

    if (
      requestedBranchId != null &&
      (!Number.isInteger(requestedBranchId) || requestedBranchId <= 0)
    ) {
      return badRequest(res, 'Branch is required');
    }

    const normalizedBranchId = resolveAuthorizedBranchId(
      user,
      requestedBranchId,
    );

    if (!normalizedBranchId) {
      return badRequest(res, 'Branch is required');
    }

    if (!date_of_birth) {
      return badRequest(res, 'Date of birth is required');
    }

    if (Number.isNaN(Date.parse(date_of_birth))) {
      return badRequest(res, 'Date of birth is invalid');
    }

    if (!gender) {
      return badRequest(res, 'Gender is required');
    }

    if (!VALID_GENDERS.has(gender)) {
      return badRequest(res, 'Invalid gender');
    }

    if (!address?.trim()) {
      return badRequest(res, 'Address is required');
    }

    if (!city?.trim()) {
      return badRequest(res, 'City is required');
    }

    if (!state?.trim()) {
      return badRequest(res, 'State is required');
    }

    if (!pincode?.trim() || !/^\d{6}$/.test(pincode.trim())) {
      return badRequest(res, 'Valid 6-digit PIN code is required');
    }

    if (!emergency_contact_name?.trim()) {
      return badRequest(res, 'Emergency contact name is required');
    }

    if (
      !emergency_contact_phone?.trim() ||
      !/^\d{10}$/.test(emergency_contact_phone.trim())
    ) {
      return badRequest(res, 'Valid emergency phone is required');
    }

    if (!emergency_contact_relation?.trim()) {
      return badRequest(res, 'Relationship is required');
    }

    if (normalizedEmail && !EMAIL_PATTERN.test(normalizedEmail)) {
      return badRequest(res, 'Invalid email');
    }

    const student = await studentService.createStudent({
      name: name.trim(),
      phone: phone.trim(),
      email: normalizedEmail || null,
      study_plan,
      branch_id: normalizedBranchId,
      date_of_birth,
      gender,
      blood_group: blood_group?.trim() || null,
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      emergency_contact_name: emergency_contact_name.trim(),
      emergency_contact_phone: emergency_contact_phone.trim(),
      emergency_contact_relation: emergency_contact_relation.trim(),
      id_proof_type: id_proof_type?.trim() || null,
      id_proof_number: id_proof_number?.trim() || null,
    });

    res.status(201).json({
      success: true,
      data: student,
      message: 'Student created successfully',
    });
  } catch (error) {
    if (isAuthorizationError(error)) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }

    console.error('Create student error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create student',
    });
  }
}

// PUT /api/students/:id - Update existing student
export async function updateStudent(req: AuthRequest, res: Response) {
  try {
    const id = Number.parseInt(req.params.id as string, 10);
    const updateData = req.body;

    if (Number.isNaN(id)) {
      return badRequest(res, 'Invalid student ID');
    }

    if (Object.keys(updateData).length === 0) {
      return badRequest(res, 'No fields to update');
    }

    const user = requireAuthenticatedUser(req.user);
    const branchId = resolveAuthorizedBranchId(user);
    const updatedStudent = await studentService.updateStudent(
      id,
      updateData,
      branchId,
    );

    if (!updatedStudent) {
      return res.status(404).json({
        success: false,
        error: 'Student not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Student updated successfully',
      data: updatedStudent,
    });
  } catch (error) {
    if (isAuthorizationError(error)) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }

    console.error('Update student error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update student',
    });
  }
}

// DELETE /api/students/:id - Delete student (soft delete)
export async function deleteStudent(req: AuthRequest, res: Response) {
  try {
    const id = Number.parseInt(req.params.id as string, 10);

    if (Number.isNaN(id)) {
      return badRequest(res, 'Invalid student ID');
    }

    const user = requireAuthenticatedUser(req.user);
    const branchId = resolveAuthorizedBranchId(user);
    const deleted = await studentService.deleteStudent(id, branchId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Student not found or already deleted',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Student marked as inactive successfully',
    });
  } catch (error) {
    if (isAuthorizationError(error)) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }

    console.error('Delete student error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete student',
    });
  }
}

// PATCH /api/students/:id/reactivate - Reactivate student
export async function reactivateStudent(req: AuthRequest, res: Response) {
  try {
    const id = Number.parseInt(req.params.id as string, 10);

    if (Number.isNaN(id)) {
      return badRequest(res, 'Invalid student ID');
    }

    const user = requireAuthenticatedUser(req.user);
    const branchId = resolveAuthorizedBranchId(user);
    const student = await studentService.reactivateStudent(id, branchId);

    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found or already active',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Student reactivated successfully',
      data: student,
    });
  } catch (error) {
    if (isAuthorizationError(error)) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }

    console.error('Reactivate student error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reactivate student',
    });
  }
}
