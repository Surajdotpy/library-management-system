import type { Student, CreateStudentDTO, UpdateStudentDTO } from './students.types.js';
export declare function getAllStudents(branchId?: number): Promise<Student[]>;
export declare function getStudentById(id: number, branchId?: number): Promise<Student | null>;
export declare function createStudent(data: CreateStudentDTO): Promise<Student>;
export declare function updateStudent(id: number, data: UpdateStudentDTO, branchId?: number): Promise<Student | null>;
export declare function deleteStudent(id: number, branchId?: number): Promise<boolean>;
//# sourceMappingURL=students.service.d.ts.map