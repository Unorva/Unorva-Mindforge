import { deleteFetcher, getFetcher, patchFetcher, postFetcher, putFetcher } from '@/api/global-fetcher'
import type { ApiResult } from '@/types/api'

export type ProjectStatus = '规划中' | '进行中' | '已完成' | '已归档'
export type RequirementStatus = '待处理' | '进行中' | '已完成'
export type DefectStatus = '待修复' | '修复中' | '待验证' | '已关闭'
export type Priority = '低' | '中' | '高'
export type Severity = '轻微' | '一般' | '严重' | '阻断'

export type Requirement = {
  id: number
  title: string
  description: string
  priority: Priority
  status: RequirementStatus
  owner: string
  dueDate: string
}

export type Defect = {
  id: number
  title: string
  description: string
  reproductionSteps: string
  severity: Severity
  priority: Priority
  status: DefectStatus
  owner: string
  dueDate: string
  requirementId?: number
}

export type Project = {
  id: number
  name: string
  description: string
  status: ProjectStatus
  owner: string
  startDate: string
  endDate: string
  requirements: Requirement[]
  defects: Defect[]
}

export type ProjectSaveParams = Pick<Project, 'description' | 'name' | 'status'> & {
  startDate: string | null
  endDate: string | null
}
export type RequirementSaveParams = Pick<Requirement, 'description' | 'priority' | 'status' | 'title'> & {
  dueDate: string | null
}
export type DefectSaveParams = Pick<Defect, 'description' | 'priority' | 'reproductionSteps' | 'severity' | 'status' | 'title'> & {
  dueDate: string | null
  requirementId: number | null
}

export function getProjects() {
  return getFetcher('/projects') as Promise<ApiResult<Project[]>>
}

export function createProject(params: ProjectSaveParams) {
  return postFetcher('/projects', params) as Promise<ApiResult<Project>>
}

export function updateProject(projectId: number, params: ProjectSaveParams) {
  return putFetcher(`/projects/${projectId}`, params) as Promise<ApiResult<Project>>
}

export function archiveProject(projectId: number) {
  return patchFetcher(`/projects/${projectId}/archive`) as Promise<ApiResult<void>>
}

export function createRequirement(projectId: number, params: RequirementSaveParams) {
  return postFetcher(`/projects/${projectId}/requirements`, params) as Promise<ApiResult<Requirement>>
}

export function updateRequirement(projectId: number, requirementId: number, params: RequirementSaveParams) {
  return putFetcher(`/projects/${projectId}/requirements/${requirementId}`, params) as Promise<ApiResult<Requirement>>
}

export function updateRequirementStatus(projectId: number, requirementId: number, status: RequirementStatus) {
  return patchFetcher(`/projects/${projectId}/requirements/${requirementId}/status`, { status }) as Promise<ApiResult<void>>
}

export function deleteRequirement(projectId: number, requirementId: number) {
  return deleteFetcher(`/projects/${projectId}/requirements/${requirementId}`) as Promise<ApiResult<void>>
}

export function createDefect(projectId: number, params: DefectSaveParams) {
  return postFetcher(`/projects/${projectId}/defects`, params) as Promise<ApiResult<Defect>>
}

export function updateDefect(projectId: number, defectId: number, params: DefectSaveParams) {
  return putFetcher(`/projects/${projectId}/defects/${defectId}`, params) as Promise<ApiResult<Defect>>
}

export function updateDefectStatus(projectId: number, defectId: number, status: DefectStatus) {
  return patchFetcher(`/projects/${projectId}/defects/${defectId}/status`, { status }) as Promise<ApiResult<void>>
}

export function deleteDefect(projectId: number, defectId: number) {
  return deleteFetcher(`/projects/${projectId}/defects/${defectId}`) as Promise<ApiResult<void>>
}
