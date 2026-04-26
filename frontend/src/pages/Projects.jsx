import { useState, useEffect } from 'react'
import { api } from '../api'
import { Plus, Edit2, Trash2, X, Search, FolderKanban, Clock } from 'lucide-react'

export default function Projects() {
  const [projects, setProjects] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showProjectModal, setShowProjectModal] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [editingTask, setEditingTask] = useState(null)
  const [selectedProject, setSelectedProject] = useState(null)
  const [projectForm, setProjectForm] = useState({ name: '', description: '', status: 'planning', deadline: '' })
  const [taskForm, setTaskForm] = useState({ project_id: '', title: '', description: '', status: 'todo', assigned_to: '', deadline: '' })
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [projData, taskData] = await Promise.all([
        api.projects.list(),
        api.projectTasks.list()
      ])
      setProjects(projData)
      setTasks(taskData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  function openProjectModal(project = null) {
    if (project) {
      setEditingProject(project)
      setProjectForm({ name: project.name, description: project.description || '', status: project.status, deadline: project.deadline || '' })
    } else {
      setEditingProject(null)
      setProjectForm({ name: '', description: '', status: 'planning', deadline: '' })
    }
    setError('')
    setShowProjectModal(true)
  }

  function openTaskModal(projectId = null, task = null) {
    if (task) {
      setEditingTask(task)
      setTaskForm({ project_id: task.project_id, title: task.title, description: task.description || '', status: task.status, assigned_to: task.assigned_to || '', deadline: task.deadline || '' })
    } else {
      setEditingTask(null)
      setTaskForm({ project_id: projectId || selectedProject?.id || '', title: '', description: '', status: 'todo', assigned_to: '', deadline: '' })
    }
    setError('')
    setShowTaskModal(true)
  }

  async function handleProjectSubmit(e) {
    e.preventDefault()
    if (!projectForm.name.trim()) {
      setError('Le nom du projet est requis')
      return
    }
    try {
      if (editingProject) {
        await api.projects.update(editingProject.id, projectForm)
      } else {
        await api.projects.create(projectForm)
      }
      setShowProjectModal(false)
      loadData()
    } catch (error) {
      setError(error.message)
    }
  }

  async function handleTaskSubmit(e) {
    e.preventDefault()
    if (!taskForm.title.trim() || !taskForm.project_id) {
      setError('Le titre et le projet sont requis')
      return
    }
    try {
      if (editingTask) {
        await api.projectTasks.update(editingTask.id, taskForm)
      } else {
        await api.projectTasks.create(taskForm)
      }
      setShowTaskModal(false)
      loadData()
    } catch (error) {
      setError(error.message)
    }
  }

  async function handleProjectDelete(id) {
    if (confirm('Supprimer ce projet et toutes ses tâches ?')) {
      try {
        await api.projects.delete(id)
        loadData()
      } catch (error) {
        alert(error.message)
      }
    }
  }

  async function handleTaskDelete(id) {
    if (confirm('Supprimer cette tâche ?')) {
      try {
        await api.projectTasks.delete(id)
        loadData()
      } catch (error) {
        alert(error.message)
      }
    }
  }

  function getProjectTasks(projectId) {
    return tasks.filter(t => t.project_id === projectId)
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Chargement...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Projets</h2>
        <button
          onClick={() => openProjectModal()}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus size={20} />
          Nouveau projet
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            Aucun projet. Créez votre premier projet !
          </div>
        ) : (
          projects.map((project) => {
            const projectTasks = getProjectTasks(project.id)
            const completedTasks = projectTasks.filter(t => t.status === 'done').length
            const progress = projectTasks.length > 0 ? Math.round((completedTasks / projectTasks.length) * 100) : 0

            return (
              <div key={project.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary-100 p-2 rounded-lg">
                      <FolderKanban className="text-primary-600" size={20} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">{project.name}</h3>
                      <p className="text-sm text-gray-500">{projectTasks.length} tâches</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    project.status === 'completed' ? 'bg-green-100 text-green-800' :
                    project.status === 'active' ? 'bg-blue-100 text-blue-800' :
                    project.status === 'on_hold' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {project.status}
                  </span>
                </div>

                {project.description && (
                  <p className="text-sm text-gray-600 mb-4">{project.description}</p>
                )}

                {project.deadline && (
                  <p className="text-xs text-gray-500 mb-4 flex items-center gap-1">
                    <Clock size={12} />
                    Échéance: {new Date(project.deadline).toLocaleDateString('fr-FR')}
                  </p>
                )}

                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Progression</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-600 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => { setSelectedProject(project); openTaskModal(project.id) }}
                    className="flex-1 px-3 py-2 text-sm bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100"
                  >
                    + Tâche
                  </button>
                  <button
                    onClick={() => openProjectModal(project)}
                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleProjectDelete(project.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {projectTasks.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-500 mb-2">DERNIÈRES TÂCHES</p>
                    <div className="space-y-2">
                      {projectTasks.slice(0, 3).map(task => (
                        <div key={task.id} className="flex items-center justify-between text-sm">
                          <span className={`${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                            {task.title}
                          </span>
                          <button
                            onClick={() => openTaskModal(project.id, task)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            <Edit2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {showProjectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                {editingProject ? 'Modifier le projet' : 'Nouveau projet'}
              </h3>
              <button onClick={() => setShowProjectModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleProjectSubmit}>
              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                  <input
                    type="text"
                    value={projectForm.name}
                    onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={projectForm.description}
                    onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                    rows="2"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                  <select
                    value={projectForm.status}
                    onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="planning">Planification</option>
                    <option value="active">Actif</option>
                    <option value="on_hold">En pause</option>
                    <option value="completed">Terminé</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date limite</label>
                  <input
                    type="date"
                    value={projectForm.deadline}
                    onChange={(e) => setProjectForm({ ...projectForm, deadline: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setShowProjectModal(false)} className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50">
                  Annuler
                </button>
                <button type="submit" className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                  {editingProject ? 'Modifier' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTaskModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                {editingTask ? 'Modifier la tâche' : 'Nouvelle tâche'}
              </h3>
              <button onClick={() => setShowTaskModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleTaskSubmit}>
              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Projet</label>
                  <select
                    value={taskForm.project_id}
                    onChange={(e) => setTaskForm({ ...taskForm, project_id: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Sélectionner un projet</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
                  <input
                    type="text"
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                    rows="2"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                  <select
                    value={taskForm.status}
                    onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="todo">À faire</option>
                    <option value="in_progress">En cours</option>
                    <option value="done">Terminé</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assigné à</label>
                  <input
                    type="text"
                    value={taskForm.assigned_to}
                    onChange={(e) => setTaskForm({ ...taskForm, assigned_to: e.target.value })}
                    placeholder="Nom du responsable"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date limite</label>
                  <input
                    type="date"
                    value={taskForm.deadline}
                    onChange={(e) => setTaskForm({ ...taskForm, deadline: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setShowTaskModal(false)} className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50">
                  Annuler
                </button>
                {editingTask && (
                  <button type="button" onClick={() => handleTaskDelete(editingTask.id)} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                    Supprimer
                  </button>
                )}
                <button type="submit" className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                  {editingTask ? 'Modifier' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}