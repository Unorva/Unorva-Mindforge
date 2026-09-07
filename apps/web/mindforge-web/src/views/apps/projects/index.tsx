import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { createColumnHelper } from '@tanstack/react-table'
import {
  Archive,
  ArrowLeft,
  Bug,
  CircleAlert,
  FileText,
  FolderKanban,
  ListTodo,
  Pencil,
  Plus,
  Settings,
  Trash2,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Input } from '@/components/ui/input'
import { Field, FieldLabel } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { DataTable, type DataTableFeatures } from '@/components/data-table/data-table'
import { cn } from '@/lib/utils'
import { ProjectDatePicker } from './data-picker'

type ProjectStatus = '规划中' | '进行中' | '已完成' | '已归档'
type RequirementStatus = '待处理' | '进行中' | '已完成'
type DefectStatus = '待修复' | '修复中' | '待验证' | '已关闭'
type Priority = '低' | '中' | '高'
type Severity = '轻微' | '一般' | '严重' | '阻断'

type Requirement = {
  id: string
  title: string
  description: string
  priority: Priority
  status: RequirementStatus
  owner: string
  dueDate: string
}

type Defect = {
  id: string
  title: string
  description: string
  reproductionSteps: string
  severity: Severity
  priority: Priority
  status: DefectStatus
  owner: string
  dueDate: string
  requirementId?: string
}

type Project = {
  id: string
  name: string
  description: string
  status: ProjectStatus
  owner: string
  startDate: string
  endDate: string
  requirements: Requirement[]
  defects: Defect[]
}

const STORAGE_KEY = 'mindforge-project-management-preview'

const initialProjects: Project[] = [
  {
    id: 'project-preview',
    name: '示例：个人知识库升级',
    description: '将零散笔记沉淀为可检索、可复盘的个人知识库。',
    status: '进行中',
    owner: '我',
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    requirements: [
      {
        id: 'requirement-preview',
        title: '支持按标签筛选笔记',
        description: '在笔记列表中提供多标签筛选和清空筛选条件的入口。',
        priority: '高',
        status: '进行中',
        owner: '我',
        dueDate: '2026-09-12',
      },
    ],
    defects: [
      {
        id: 'defect-preview',
        title: '筛选后返回列表状态丢失',
        description: '进入笔记详情后返回，已选的标签筛选条件没有保留。',
        reproductionSteps: '1. 选择任意标签筛选\n2. 进入一篇笔记详情\n3. 返回列表',
        severity: '一般',
        priority: '中',
        status: '待修复',
        owner: '我',
        dueDate: '2026-09-10',
        requirementId: 'requirement-preview',
      },
    ],
  },
]

const projectStatuses: ProjectStatus[] = ['规划中', '进行中', '已完成', '已归档']
const requirementStatuses: RequirementStatus[] = ['待处理', '进行中', '已完成']
const defectStatuses: DefectStatus[] = ['待修复', '修复中', '待验证', '已关闭']
const priorities: Priority[] = ['低', '中', '高']
const severities: Severity[] = ['轻微', '一般', '严重', '阻断']
const emptyProjectForm = () => ({
  name: '',
  description: '',
  status: '规划中' as ProjectStatus,
  owner: '我',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: '',
})

const emptyRequirementForm = () => ({
  title: '',
  description: '',
  priority: '中' as Priority,
  status: '待处理' as RequirementStatus,
  owner: '我',
  dueDate: '',
})

const emptyDefectForm = () => ({
  title: '',
  description: '',
  reproductionSteps: '',
  severity: '一般' as Severity,
  priority: '中' as Priority,
  status: '待修复' as DefectStatus,
  owner: '我',
  dueDate: '',
  requirementId: '',
})

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function readProjects(): Project[] {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) as Project[] : initialProjects
  } catch {
    return initialProjects
  }
}

function statusClass(status: string) {
  if (status === '已完成' || status === '已关闭') return 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400'
  if (status === '进行中' || status === '修复中' || status === '待验证') return 'bg-blue-500/12 text-blue-700 dark:text-blue-400'
  if (status === '已归档') return 'bg-muted text-muted-foreground'
  return 'bg-amber-500/12 text-amber-700 dark:text-amber-400'
}

function priorityClass(priority: Priority | Severity) {
  if (priority === '高' || priority === '严重' || priority === '阻断') return 'bg-red-500/12 text-red-700 dark:text-red-400'
  if (priority === '中' || priority === '一般') return 'bg-amber-500/12 text-amber-700 dark:text-amber-400'
  return 'bg-slate-500/12 text-slate-700 dark:text-slate-300'
}

function Pill({ children, className }: { children: React.ReactNode; className: string }) {
  return <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium', className)}>{children}</span>
}

function OptionSelect<T extends string>({
  ariaLabel,
  className,
  disabled = false,
  items,
  onValueChange,
  value,
}: {
  ariaLabel: string
  className?: string
  disabled?: boolean
  items: readonly T[]
  onValueChange: (value: T) => void
  value: T
}) {
  return (
    <Select disabled={disabled} value={value} onValueChange={(nextValue) => nextValue && onValueChange(nextValue as T)}>
      <SelectTrigger aria-label={ariaLabel} className={cn('w-full cursor-pointer', className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => <SelectItem className="cursor-pointer" key={item} value={item}>{item}</SelectItem>)}
      </SelectContent>
    </Select>
  )
}

export default function Projects() {
  const navigate = useNavigate()
  const { projectId } = useParams()
  const [projects, setProjects] = useState<Project[]>(readProjects)
  const [projectDialogOpen, setProjectDialogOpen] = useState(false)
  const [requirementDialogOpen, setRequirementDialogOpen] = useState(false)
  const [defectDialogOpen, setDefectDialogOpen] = useState(false)
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false)
  const [editingRequirementId, setEditingRequirementId] = useState<string | null>(null)
  const [editingDefectId, setEditingDefectId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string; type: 'requirement' | 'defect' } | null>(null)
  const [requirementDetailsTarget, setRequirementDetailsTarget] = useState<Pick<Requirement, 'description' | 'title'> | null>(null)
  const [reproductionStepsTarget, setReproductionStepsTarget] = useState<Pick<Defect, 'description' | 'reproductionSteps' | 'title'> | null>(null)
  const [projectForm, setProjectForm] = useState(emptyProjectForm)
  const [requirementForm, setRequirementForm] = useState(emptyRequirementForm)
  const [defectForm, setDefectForm] = useState(emptyDefectForm)

  useEffect(() => {
    // 第一版只在浏览器本地保存，便于先确认交互和信息结构，后续可平滑替换为接口调用。
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
  }, [projects])

  const activeProject = projects.find((project) => project.id === projectId)
  const activeProjects = projects.filter((project) => project.status !== '已归档')

  const updateActiveProject = (updater: (project: Project) => Project) => {
    if (!activeProject) return
    setProjects((current) => current.map((project) => project.id === activeProject.id ? updater(project) : project))
  }

  const createProject = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!projectForm.name.trim()) return
    const project: Project = {
      id: createId('project'),
      ...projectForm,
      name: projectForm.name.trim(),
      description: projectForm.description.trim(),
      owner: projectForm.owner.trim() || '我',
      requirements: [],
      defects: [],
    }
    setProjects((current) => [project, ...current])
    setProjectDialogOpen(false)
    setProjectForm(emptyProjectForm())
    navigate(`/apps/projects/${project.id}`)
  }

  const saveRequirement = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!requirementForm.title.trim()) return
    updateActiveProject((project) => ({
      ...project,
      requirements: editingRequirementId ? project.requirements.map((item) => item.id === editingRequirementId ? {
        ...item,
        ...requirementForm,
        title: requirementForm.title.trim(),
        description: requirementForm.description.trim(),
        owner: requirementForm.owner.trim() || '我',
      } : item) : [{
        id: createId('requirement'),
        ...requirementForm,
        title: requirementForm.title.trim(),
        description: requirementForm.description.trim(),
        owner: requirementForm.owner.trim() || '我',
      }, ...project.requirements],
    }))
    setRequirementDialogOpen(false)
    setEditingRequirementId(null)
    setRequirementForm(emptyRequirementForm())
  }

  const saveDefect = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!defectForm.title.trim()) return
    updateActiveProject((project) => ({
      ...project,
      defects: editingDefectId ? project.defects.map((item) => item.id === editingDefectId ? {
        ...item,
        ...defectForm,
        title: defectForm.title.trim(),
        description: defectForm.description.trim(),
        reproductionSteps: defectForm.reproductionSteps.trim(),
        owner: defectForm.owner.trim() || '我',
        requirementId: defectForm.requirementId || undefined,
      } : item) : [{
        id: createId('defect'),
        ...defectForm,
        title: defectForm.title.trim(),
        description: defectForm.description.trim(),
        reproductionSteps: defectForm.reproductionSteps.trim(),
        owner: defectForm.owner.trim() || '我',
        requirementId: defectForm.requirementId || undefined,
      }, ...project.defects],
    }))
    setDefectDialogOpen(false)
    setEditingDefectId(null)
    setDefectForm(emptyDefectForm())
  }

  const editRequirement = (requirement: Requirement) => {
    const { id, ...form } = requirement
    setEditingRequirementId(id)
    setRequirementForm(form)
    setRequirementDialogOpen(true)
  }

  const editDefect = (defect: Defect) => {
    const { id, ...form } = defect
    setEditingDefectId(id)
    setDefectForm({ ...form, requirementId: form.requirementId ?? '' })
    setDefectDialogOpen(true)
  }

  const deleteWorkItem = () => {
    if (!deleteTarget) return
    updateActiveProject((project) => deleteTarget.type === 'requirement' ? {
      ...project,
      requirements: project.requirements.filter((item) => item.id !== deleteTarget.id),
      defects: project.defects.map((item) => item.requirementId === deleteTarget.id ? { ...item, requirementId: undefined } : item),
    } : {
      ...project,
      defects: project.defects.filter((item) => item.id !== deleteTarget.id),
    })
    setDeleteTarget(null)
  }

  const projectStats = useMemo(() => ({
    projects: activeProjects.length,
    requirements: activeProjects.reduce((count, project) => count + project.requirements.length, 0),
    openDefects: activeProjects.reduce((count, project) => count + project.defects.filter((defect) => defect.status !== '已关闭').length, 0),
  }), [activeProjects])

  if (projectId && !activeProject) {
    return (
      <Empty className="min-h-72 border">
        <EmptyHeader><EmptyMedia variant="icon"><FolderKanban /></EmptyMedia><EmptyTitle>项目不存在</EmptyTitle><EmptyDescription>它可能已被归档或链接已失效。</EmptyDescription></EmptyHeader>
        <EmptyContent><Button onClick={() => navigate('/apps/projects')} variant="outline"><ArrowLeft />返回项目列表</Button></EmptyContent>
      </Empty>
    )
  }

  if (!activeProject) {
    return (
      <>
        <div className="space-y-6">
          <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <div className="flex items-center gap-2 text-primary"><FolderKanban className="size-5" /><span className="text-sm font-medium">个人项目空间</span></div>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">项目管理</h1>
              <p className="mt-1 text-sm text-muted-foreground">集中管理项目、需求和缺陷，先从一个清晰的目标开始。</p>
            </div>
            <Button onClick={() => setProjectDialogOpen(true)}><Plus />新建项目</Button>
          </section>

          <section className="grid gap-4 sm:grid-cols-3">
            <StatCard icon={FolderKanban} label="进行中的项目" value={projectStats.projects} />
            <StatCard icon={ListTodo} label="全部需求" value={projectStats.requirements} />
            <StatCard icon={CircleAlert} label="待关闭缺陷" value={projectStats.openDefects} tone="destructive" />
          </section>

          {activeProjects.length ? (
            <section className="space-y-3">
              <div className="flex items-center justify-between"><div><h2 className="font-semibold">我的项目</h2><p className="mt-0.5 text-sm text-muted-foreground">选择一个项目，继续处理其中的需求和缺陷。</p></div><span className="text-sm text-muted-foreground">{activeProjects.length} 个项目</span></div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {activeProjects.map((project) => {
                  const openDefects = project.defects.filter((defect) => defect.status !== '已关闭').length
                  return (
                    <button
                      className="group text-left"
                      key={project.id}
                      onClick={() => navigate(`/apps/projects/${project.id}`)}
                      type="button"
                    >
                      <Card className="h-full border border-border/70 bg-card shadow-sm transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/30 group-hover:shadow-md">
                        <CardHeader>
                          <div className="flex items-start justify-between gap-3">
                            <div className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary"><FolderKanban className="size-4" /></div>
                            <Pill className={statusClass(project.status)}>{project.status}</Pill>
                          </div>
                          <CardTitle className="mt-2 line-clamp-1">{project.name}</CardTitle>
                          <CardDescription className="line-clamp-2 min-h-10">{project.description || '暂无项目简介'}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-3 border-y py-3 text-sm">
                            <div><p className="text-muted-foreground">需求</p><p className="mt-1 font-medium">{project.requirements.length} 条</p></div>
                            <div><p className="text-muted-foreground">待处理缺陷</p><p className="mt-1 font-medium">{openDefects} 个</p></div>
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground"><span>负责人：{project.owner}</span><span>{project.endDate ? `至 ${project.endDate}` : '未设置结束日期'}</span></div>
                        </CardContent>
                      </Card>
                    </button>
                  )
                })}
              </div>
            </section>
          ) : <EmptyState icon={FolderKanban} title="还没有项目" description="新建一个项目，开始梳理需求和待解决的问题。" action={() => setProjectDialogOpen(true)} actionLabel="新建项目" disabled={false} />}
        </div>
        <ProjectDialog form={projectForm} onFormChange={setProjectForm} onOpenChange={setProjectDialogOpen} onSubmit={createProject} open={projectDialogOpen} />
      </>
    )
  }

  const linkedRequirement = (requirementId?: string) => activeProject.requirements.find((item) => item.id === requirementId)
  const archiveProject = () => {
    updateActiveProject((project) => ({ ...project, status: '已归档' }))
    setArchiveDialogOpen(false)
    navigate('/apps/projects')
  }

  return (
    <>
      <div className="space-y-6">
        <section className="border-b pb-5">
          <div className="min-w-0">
            <Breadcrumb className="mb-3">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink render={<Link to="/apps/projects" />}>项目列表</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{activeProject.name}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-semibold tracking-tight">{activeProject.name}</h1><Pill className={statusClass(activeProject.status)}>{activeProject.status}</Pill></div>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{activeProject.description || '暂无项目简介'}</p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground"><span>负责人：{activeProject.owner}</span><span>开始：{activeProject.startDate || '未设置'}</span><span>结束：{activeProject.endDate || '未设置'}</span></div>
          </div>
        </section>

        <Tabs className="h-[calc(100dvh-15rem)] min-h-0 flex-col gap-6 lg:flex-row" defaultValue="requirements" orientation="vertical">
          <aside className="shrink-0 lg:w-44">
            <p className="mb-2 px-2 text-xs font-medium text-muted-foreground">项目工作台</p>
            <TabsList aria-label="项目工作项" className="flex h-auto w-full flex-col items-stretch gap-1">
              <TabsTrigger className="h-9 w-full flex-none justify-start px-3" value="requirements"><ListTodo />需求管理 <span className="ml-auto text-xs text-muted-foreground">{activeProject.requirements.length}</span></TabsTrigger>
              <TabsTrigger className="h-9 w-full flex-none justify-start px-3" value="defects"><Bug />缺陷管理 <span className="ml-auto text-xs text-muted-foreground">{activeProject.defects.length}</span></TabsTrigger>
              <TabsTrigger className="h-9 w-full flex-none justify-start px-3" value="settings"><Settings />项目设置</TabsTrigger>
            </TabsList>
          </aside>

          <TabsContent className="h-full min-h-0 w-full overflow-y-auto" value="requirements">
            <ManagementPanel
              action={() => { setEditingRequirementId(null); setRequirementForm(emptyRequirementForm()); setRequirementDialogOpen(true) }}
              actionLabel="添加需求"
              description="跟踪项目需要交付的工作项，并及时更新处理状态。"
              disabled={activeProject.status === '已归档'}
              title="需求管理"
            >
              <RequirementsTable disabled={activeProject.status === '已归档'} onDelete={(requirement) => setDeleteTarget({ id: requirement.id, title: requirement.title, type: 'requirement' })} onDetails={(requirement) => setRequirementDetailsTarget(requirement)} onEdit={editRequirement} requirements={activeProject.requirements} onStatusChange={(requirementId, status) => updateActiveProject((project) => ({ ...project, requirements: project.requirements.map((item) => item.id === requirementId ? { ...item, status } : item) }))} />
            </ManagementPanel>
          </TabsContent>

          <TabsContent className="h-full min-h-0 w-full overflow-y-auto" value="defects">
            <ManagementPanel
              action={() => { setEditingDefectId(null); setDefectForm(emptyDefectForm()); setDefectDialogOpen(true) }}
              actionLabel="添加缺陷"
              description="记录问题、关联需求并持续跟踪修复进度。"
              disabled={activeProject.status === '已归档'}
              title="缺陷管理"
            >
              <DefectsTable defects={activeProject.defects} disabled={activeProject.status === '已归档'} linkedRequirement={linkedRequirement} onDelete={(defect) => setDeleteTarget({ id: defect.id, title: defect.title, type: 'defect' })} onDetails={(defect) => setReproductionStepsTarget(defect)} onEdit={editDefect} onStatusChange={(defectId, status) => updateActiveProject((project) => ({ ...project, defects: project.defects.map((item) => item.id === defectId ? { ...item, status } : item) }))} />
            </ManagementPanel>
          </TabsContent>

          <TabsContent className="h-full min-h-0 w-full overflow-y-auto" value="settings">
            <ProjectSettings onArchive={() => setArchiveDialogOpen(true)} onSave={(details) => updateActiveProject((project) => ({ ...project, ...details }))} project={activeProject} />
          </TabsContent>
        </Tabs>
      </div>
      <RequirementDialog editing={editingRequirementId !== null} form={requirementForm} onFormChange={setRequirementForm} onOpenChange={setRequirementDialogOpen} onSubmit={saveRequirement} open={requirementDialogOpen} />
      <DefectDialog editing={editingDefectId !== null} form={defectForm} onFormChange={setDefectForm} onOpenChange={setDefectDialogOpen} onSubmit={saveDefect} open={defectDialogOpen} requirements={activeProject.requirements} />
      <ArchiveProjectDialog onArchive={archiveProject} onOpenChange={setArchiveDialogOpen} open={archiveDialogOpen} projectName={activeProject.name} />
      <DeleteWorkItemDialog onDelete={deleteWorkItem} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }} target={deleteTarget} />
      <RequirementDetailsDialog onOpenChange={(open) => { if (!open) setRequirementDetailsTarget(null) }} target={requirementDetailsTarget} />
      <ReproductionStepsDialog onOpenChange={(open) => { if (!open) setReproductionStepsTarget(null) }} target={reproductionStepsTarget} />
    </>
  )
}

function StatCard({ icon: Icon, label, value, tone }: { icon: typeof FolderKanban; label: string; value: number; tone?: 'destructive' }) {
  const isDestructive = tone === 'destructive'
  return <Card className={cn('border-0 shadow-none', isDestructive ? 'bg-destructive/5 ring-destructive/15' : 'bg-primary/5 ring-primary/15')} size="sm"><CardContent className="flex items-center gap-3"><div className={cn('grid size-10 place-items-center rounded-full', isDestructive ? 'bg-destructive/12 text-destructive' : 'bg-primary/12 text-primary')}><Icon className="size-4" /></div><div><p className="text-sm text-muted-foreground">{label}</p><p className={cn('mt-0.5 text-2xl font-semibold leading-none', isDestructive && 'text-destructive')}>{value}</p></div></CardContent></Card>
}

function EmptyState({ action, actionLabel, description, disabled, icon: Icon, title }: { action: () => void; actionLabel: string; description: string; disabled: boolean; icon: typeof Bug; title: string }) {
  return <Empty className="min-h-0 flex-1 border"><EmptyHeader><EmptyMedia variant="icon"><Icon /></EmptyMedia><EmptyTitle>{title}</EmptyTitle><EmptyDescription>{description}</EmptyDescription></EmptyHeader>{!disabled && <EmptyContent><Button onClick={action} size="sm"><Plus />{actionLabel}</Button></EmptyContent>}</Empty>
}

type ProjectSettingsForm = Pick<Project, 'description' | 'endDate' | 'name' | 'owner' | 'startDate' | 'status'>

function projectSettingsFrom(project: Project): ProjectSettingsForm {
  return {
    name: project.name,
    description: project.description,
    status: project.status,
    owner: project.owner,
    startDate: project.startDate,
    endDate: project.endDate,
  }
}

function ProjectSettings({ onArchive, onSave, project }: { onArchive: () => void; onSave: (details: ProjectSettingsForm) => void; project: Project }) {
  const [form, setForm] = useState<ProjectSettingsForm>(() => projectSettingsFrom(project))

  useEffect(() => {
    // 项目数据在其他区域更新后，同步设置表单，避免保存时覆盖最新状态。
    setForm(projectSettingsFrom(project))
  }, [project])

  const saveSettings = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.name.trim()) return
    onSave({ ...form, name: form.name.trim(), description: form.description.trim(), owner: form.owner.trim() || '我' })
  }

  return (
    <section className="min-h-full">
      <header className="border-b pb-5">
        <h2 className="font-semibold">项目设置</h2>
        <p className="mt-1 text-sm text-muted-foreground">修改项目基础信息，这些内容会同步显示在项目列表与概览中。</p>
      </header>
      <form className="grid max-w-3xl gap-5 py-6" onSubmit={saveSettings}>
        <div><h3 className="font-medium">基础信息</h3><p className="mt-1 text-sm text-muted-foreground">更新项目名称、负责人、时间范围与当前状态。</p></div>
        <Field><FieldLabel>项目名称 *</FieldLabel><Input onChange={(event) => setForm({ ...form, name: event.target.value })} value={form.name} /></Field>
        <Field><FieldLabel>项目简介</FieldLabel><Textarea className="min-h-28" onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="用一句话说明项目要解决什么问题" value={form.description} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field><FieldLabel>项目状态</FieldLabel><OptionSelect ariaLabel="项目状态" items={projectStatuses.filter((status) => status !== '已归档')} onValueChange={(status) => setForm({ ...form, status })} value={form.status} /></Field>
          <Field><FieldLabel>负责人</FieldLabel><Input onChange={(event) => setForm({ ...form, owner: event.target.value })} value={form.owner} /></Field>
          <Field><FieldLabel>开始日期</FieldLabel><ProjectDatePicker onChange={(startDate) => setForm({ ...form, startDate })} value={form.startDate} /></Field>
          <Field><FieldLabel>结束日期</FieldLabel><ProjectDatePicker onChange={(endDate) => setForm({ ...form, endDate })} value={form.endDate} /></Field>
        </div>
        <div className="flex pt-5"><Button disabled={!form.name.trim()} type="submit">保存修改</Button></div>
      </form>
      <section className="max-w-3xl border-t py-6"><h3 className="font-medium">归档项目</h3><p className="mt-1 text-sm text-muted-foreground">归档后，项目会从项目列表中隐藏；需求与缺陷记录会保留。</p><Button className="mt-4" disabled={project.status === '已归档'} onClick={onArchive} type="button" variant="destructive"><Archive />归档项目</Button></section>
    </section>
  )
}

function ArchiveProjectDialog({ onArchive, onOpenChange, open, projectName }: { onArchive: () => void; onOpenChange: (open: boolean) => void; open: boolean; projectName: string }) {
  return <AlertDialog onOpenChange={onOpenChange} open={open}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>确认归档项目？</AlertDialogTitle><AlertDialogDescription>“{projectName}”将从项目列表中隐藏。该项目的需求与缺陷记录会继续保留在本地。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction onClick={onArchive} variant="destructive"><Archive />确认归档</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
}

function DeleteWorkItemDialog({ onDelete, onOpenChange, target }: { onDelete: () => void; onOpenChange: (open: boolean) => void; target: { id: string; title: string; type: 'requirement' | 'defect' } | null }) {
  const itemType = target?.type === 'requirement' ? '需求' : '缺陷'
  const description = target?.type === 'requirement'
    ? `“${target.title}”将被删除；关联缺陷会保留，但会解除与该需求的关联。`
    : `“${target?.title}”将被永久删除。`

  return <AlertDialog onOpenChange={onOpenChange} open={target !== null}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>确认删除{itemType}？</AlertDialogTitle><AlertDialogDescription>{description}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction onClick={onDelete} variant="destructive"><Trash2 />确认删除</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
}

function ReproductionStepsDialog({ onOpenChange, target }: { onOpenChange: (open: boolean) => void; target: Pick<Defect, 'description' | 'reproductionSteps' | 'title'> | null }) {
  return <Dialog onOpenChange={onOpenChange} open={target !== null}><DialogContent aria-label="缺陷详情" className="max-w-lg"><div className="grid gap-4 text-sm"><div className="grid gap-1.5"><p className="font-medium">缺陷标题</p><p className="whitespace-pre-wrap text-muted-foreground">{target?.title}</p></div><div className="grid gap-1.5"><p className="font-medium">问题描述</p><p className="whitespace-pre-wrap text-muted-foreground">{target?.description || '暂未记录问题描述。'}</p></div><div className="grid gap-1.5"><p className="font-medium">复现步骤</p><div className="max-h-[40vh] overflow-y-auto whitespace-pre-wrap rounded-md border bg-muted/30 p-3 leading-6">{target?.reproductionSteps || '暂未记录复现步骤。'}</div></div></div><DialogFooter><Button onClick={() => onOpenChange(false)} type="button">知道了</Button></DialogFooter></DialogContent></Dialog>
}

function RequirementDetailsDialog({ onOpenChange, target }: { onOpenChange: (open: boolean) => void; target: Pick<Requirement, 'description' | 'title'> | null }) {
  return <Dialog onOpenChange={onOpenChange} open={target !== null}><DialogContent aria-label="需求详情" className="max-w-lg"><div className="grid gap-4 text-sm"><div className="grid gap-1.5"><p className="font-medium">需求标题</p><p className="whitespace-pre-wrap text-muted-foreground">{target?.title}</p></div><div className="grid gap-1.5"><p className="font-medium">需求详情</p><div className="max-h-[40vh] overflow-y-auto whitespace-pre-wrap rounded-md border bg-muted/30 p-3 leading-6">{target?.description || '暂未记录需求详情。'}</div></div></div><DialogFooter><Button onClick={() => onOpenChange(false)} type="button">知道了</Button></DialogFooter></DialogContent></Dialog>
}

function ManagementPanel({ action, actionLabel, children, description, disabled, title }: { action: () => void; actionLabel: string; children: React.ReactNode; description: string; disabled: boolean; title: string }) {
  return <section className="flex h-full min-h-0 flex-col gap-4"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="font-semibold">{title}</h2><p className="mt-0.5 text-sm text-muted-foreground">{description}</p></div>{!disabled && <Button onClick={action} size="sm"><Plus />{actionLabel}</Button>}</div><div className="flex min-h-0 flex-1 flex-col">{children}</div></section>
}

function RequirementsTable({ disabled, onDelete, onDetails, onEdit, onStatusChange, requirements }: { disabled: boolean; onDelete: (requirement: Requirement) => void; onDetails: (requirement: Requirement) => void; onEdit: (requirement: Requirement) => void; onStatusChange: (requirementId: string, status: RequirementStatus) => void; requirements: Requirement[] }) {
  const columnHelper = createColumnHelper<DataTableFeatures, Requirement>()
  const columns = useMemo(() => columnHelper.columns([
    columnHelper.accessor('title', {
      header: '标题',
      cell: ({ getValue }) => <span className="font-medium">{getValue()}</span>,
    }),
    columnHelper.accessor('priority', {
      header: '优先级',
      cell: ({ getValue }) => <Pill className={priorityClass(getValue())}>{getValue()}</Pill>,
    }),
    columnHelper.accessor('status', {
      header: '状态',
      cell: ({ row }) => <OptionSelect ariaLabel={`${row.original.title} 的状态`} className="min-w-28" disabled={disabled} items={requirementStatuses} onValueChange={(status) => onStatusChange(row.original.id, status)} value={row.original.status} />,
    }),
    columnHelper.accessor('owner', { header: '负责人' }),
    columnHelper.accessor('dueDate', {
      header: '截止日期',
      cell: ({ getValue }) => <span className="text-muted-foreground">{getValue() || '未设置'}</span>,
    }),
    columnHelper.display({
      id: 'actions',
      header: '操作',
      enableHiding: false,
      cell: ({ row }) => <div className="flex justify-center gap-1"><Button aria-label={`查看需求详情：${row.original.title}`} onClick={() => onDetails(row.original)} size="icon" variant="ghost"><FileText /></Button><Button aria-label={`编辑需求：${row.original.title}`} disabled={disabled} onClick={() => onEdit(row.original)} size="icon" variant="ghost"><Pencil /></Button><Button aria-label={`删除需求：${row.original.title}`} disabled={disabled} onClick={() => onDelete(row.original)} size="icon" variant="ghost"><Trash2 className="text-destructive" /></Button></div>,
    }),
  ]), [disabled, onDelete, onDetails, onEdit, onStatusChange])

  return <DataTable centered columns={columns} data={requirements} fillHeight={false} searchPlaceholder="搜索需求…" />
}

function DefectsTable({ defects, disabled, linkedRequirement, onDelete, onDetails, onEdit, onStatusChange }: { defects: Defect[]; disabled: boolean; linkedRequirement: (requirementId?: string) => Requirement | undefined; onDelete: (defect: Defect) => void; onDetails: (defect: Defect) => void; onEdit: (defect: Defect) => void; onStatusChange: (defectId: string, status: DefectStatus) => void }) {
  const columnHelper = createColumnHelper<DataTableFeatures, Defect>()
  const columns = useMemo(() => columnHelper.columns([
    columnHelper.accessor('title', {
      header: '标题',
      cell: ({ getValue }) => <span className="font-medium">{getValue()}</span>,
    }),
    columnHelper.accessor('requirementId', {
      header: '关联需求',
      cell: ({ getValue }) => <span className="block max-w-40 truncate text-primary">{linkedRequirement(getValue())?.title || '未关联'}</span>,
    }),
    columnHelper.accessor('severity', {
      header: '严重程度',
      cell: ({ getValue }) => <Pill className={priorityClass(getValue())}>{getValue()}</Pill>,
    }),
    columnHelper.accessor('priority', {
      header: '优先级',
      cell: ({ getValue }) => <Pill className={priorityClass(getValue())}>{getValue()}</Pill>,
    }),
    columnHelper.accessor('status', {
      header: '状态',
      cell: ({ row }) => <OptionSelect ariaLabel={`${row.original.title} 的状态`} className="min-w-28" disabled={disabled} items={defectStatuses} onValueChange={(status) => onStatusChange(row.original.id, status)} value={row.original.status} />,
    }),
    columnHelper.accessor('owner', { header: '负责人' }),
    columnHelper.accessor('dueDate', {
      header: '预计解决',
      cell: ({ getValue }) => <span className="text-muted-foreground">{getValue() || '未设置'}</span>,
    }),
    columnHelper.display({
      id: 'actions',
      header: '操作',
      enableHiding: false,
      cell: ({ row }) => <div className="flex justify-center gap-1"><Button aria-label={`查看缺陷复现步骤：${row.original.title}`} onClick={() => onDetails(row.original)} size="icon" variant="ghost"><FileText /></Button><Button aria-label={`编辑缺陷：${row.original.title}`} disabled={disabled} onClick={() => onEdit(row.original)} size="icon" variant="ghost"><Pencil /></Button><Button aria-label={`删除缺陷：${row.original.title}`} disabled={disabled} onClick={() => onDelete(row.original)} size="icon" variant="ghost"><Trash2 className="text-destructive" /></Button></div>,
    }),
  ]), [disabled, linkedRequirement, onDelete, onDetails, onEdit, onStatusChange])

  return <DataTable centered columns={columns} data={defects} fillHeight={false} searchPlaceholder="搜索缺陷…" />
}

function ProjectDialog({ form, onFormChange, onOpenChange, onSubmit, open }: { form: ReturnType<typeof emptyProjectForm>; onFormChange: (value: ReturnType<typeof emptyProjectForm>) => void; onOpenChange: (open: boolean) => void; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void; open: boolean }) {
  return <AlertDialog onOpenChange={onOpenChange} open={open}><AlertDialogContent className="max-w-lg"><AlertDialogHeader><AlertDialogTitle>新建项目</AlertDialogTitle><AlertDialogDescription>先定义项目目标和时间范围，需求与缺陷会归属在这个项目下。</AlertDialogDescription></AlertDialogHeader><form className="grid gap-4" onSubmit={onSubmit}><Field><FieldLabel>项目名称 *</FieldLabel><Input autoFocus onChange={(event) => onFormChange({ ...form, name: event.target.value })} placeholder="例如：个人知识库升级" value={form.name} /></Field><Field><FieldLabel>项目简介</FieldLabel><Textarea onChange={(event) => onFormChange({ ...form, description: event.target.value })} placeholder="用一句话说明项目要解决什么问题" value={form.description} /></Field><div className="grid gap-4 sm:grid-cols-2"><Field><FieldLabel>项目状态</FieldLabel><OptionSelect ariaLabel="项目状态" items={projectStatuses.filter((status) => status !== '已归档')} onValueChange={(status) => onFormChange({ ...form, status })} value={form.status} /></Field><Field><FieldLabel>负责人</FieldLabel><Input onChange={(event) => onFormChange({ ...form, owner: event.target.value })} value={form.owner} /></Field><Field><FieldLabel>开始日期</FieldLabel><ProjectDatePicker onChange={(startDate) => onFormChange({ ...form, startDate })} value={form.startDate} /></Field><Field><FieldLabel>结束日期</FieldLabel><ProjectDatePicker onChange={(endDate) => onFormChange({ ...form, endDate })} value={form.endDate} /></Field></div><AlertDialogFooter><Button onClick={() => onOpenChange(false)} type="button" variant="outline">取消</Button><Button disabled={!form.name.trim()} type="submit"><Plus />创建项目</Button></AlertDialogFooter></form></AlertDialogContent></AlertDialog>
}

function RequirementDialog({ editing, form, onFormChange, onOpenChange, onSubmit, open }: { editing: boolean; form: ReturnType<typeof emptyRequirementForm>; onFormChange: (value: ReturnType<typeof emptyRequirementForm>) => void; onOpenChange: (open: boolean) => void; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void; open: boolean }) {
  const actionLabel = editing ? '保存修改' : '添加需求'
  return <Dialog onOpenChange={onOpenChange} open={open}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{editing ? '编辑需求' : '添加需求'}</DialogTitle><DialogDescription>需求应描述可交付的结果，后续可以关联相关缺陷。</DialogDescription></DialogHeader><form className="grid gap-4" onSubmit={onSubmit}><Field><FieldLabel>需求标题 *</FieldLabel><Input autoFocus onChange={(event) => onFormChange({ ...form, title: event.target.value })} placeholder="例如：支持按标签筛选笔记" value={form.title} /></Field><Field><FieldLabel>需求描述</FieldLabel><Textarea onChange={(event) => onFormChange({ ...form, description: event.target.value })} placeholder="描述目标、范围或验收标准" value={form.description} /></Field><div className="grid gap-4 sm:grid-cols-2"><Field><FieldLabel>优先级</FieldLabel><OptionSelect ariaLabel="需求优先级" items={priorities} onValueChange={(priority) => onFormChange({ ...form, priority })} value={form.priority} /></Field><Field><FieldLabel>状态</FieldLabel><OptionSelect ariaLabel="需求状态" items={requirementStatuses} onValueChange={(status) => onFormChange({ ...form, status })} value={form.status} /></Field><Field><FieldLabel>负责人</FieldLabel><Input onChange={(event) => onFormChange({ ...form, owner: event.target.value })} value={form.owner} /></Field><Field><FieldLabel>截止日期</FieldLabel><ProjectDatePicker onChange={(dueDate) => onFormChange({ ...form, dueDate })} value={form.dueDate} /></Field></div><DialogFooter><Button onClick={() => onOpenChange(false)} type="button" variant="outline">取消</Button><Button disabled={!form.title.trim()} type="submit"><Pencil />{actionLabel}</Button></DialogFooter></form></DialogContent></Dialog>
}

function DefectDialog({ editing, form, onFormChange, onOpenChange, onSubmit, open, requirements }: { editing: boolean; form: ReturnType<typeof emptyDefectForm>; onFormChange: (value: ReturnType<typeof emptyDefectForm>) => void; onOpenChange: (open: boolean) => void; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void; open: boolean; requirements: Requirement[] }) {
  const actionLabel = editing ? '保存修改' : '添加缺陷'
  return <Dialog onOpenChange={onOpenChange} open={open}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{editing ? '编辑缺陷' : '添加缺陷'}</DialogTitle><DialogDescription>缺陷可以独立记录，也可以关联到已有需求。</DialogDescription></DialogHeader><form className="grid gap-4" onSubmit={onSubmit}><Field><FieldLabel>缺陷标题 *</FieldLabel><Input autoFocus onChange={(event) => onFormChange({ ...form, title: event.target.value })} placeholder="简明描述遇到的问题" value={form.title} /></Field><Field><FieldLabel>问题描述</FieldLabel><Textarea onChange={(event) => onFormChange({ ...form, description: event.target.value })} placeholder="说明实际表现和预期表现" value={form.description} /></Field><Field><FieldLabel>复现步骤</FieldLabel><Textarea onChange={(event) => onFormChange({ ...form, reproductionSteps: event.target.value })} placeholder="例如：1. 打开… 2. 点击… 3. 观察…" value={form.reproductionSteps} /></Field><Field><FieldLabel>关联需求（可选）</FieldLabel><Select value={form.requirementId || 'unlinked'} onValueChange={(requirementId) => onFormChange({ ...form, requirementId: requirementId === 'unlinked' ? '' : requirementId || '' })}><SelectTrigger aria-label="关联需求" className="w-full cursor-pointer"><SelectValue /></SelectTrigger><SelectContent><SelectItem className="cursor-pointer" value="unlinked">不关联需求</SelectItem>{requirements.map((requirement) => <SelectItem className="cursor-pointer" key={requirement.id} value={requirement.id}>{requirement.title}</SelectItem>)}</SelectContent></Select></Field><div className="grid gap-4 sm:grid-cols-2"><Field><FieldLabel>严重程度</FieldLabel><OptionSelect ariaLabel="缺陷严重程度" items={severities} onValueChange={(severity) => onFormChange({ ...form, severity })} value={form.severity} /></Field><Field><FieldLabel>优先级</FieldLabel><OptionSelect ariaLabel="缺陷优先级" items={priorities} onValueChange={(priority) => onFormChange({ ...form, priority })} value={form.priority} /></Field><Field><FieldLabel>负责人</FieldLabel><Input onChange={(event) => onFormChange({ ...form, owner: event.target.value })} value={form.owner} /></Field><Field><FieldLabel>预计解决日期</FieldLabel><ProjectDatePicker onChange={(dueDate) => onFormChange({ ...form, dueDate })} value={form.dueDate} /></Field></div><DialogFooter><Button onClick={() => onOpenChange(false)} type="button" variant="outline">取消</Button><Button disabled={!form.title.trim()} type="submit"><Pencil />{actionLabel}</Button></DialogFooter></form></DialogContent></Dialog>
}
