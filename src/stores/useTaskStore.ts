/**
 * Task Store
 * Gentle day planner with optional reminders
 * No guilt, no urgency — just a calm place to plan your day
 */

import {create} from 'zustand';
import {Task, getTodayDateKey} from '../models/types';
import {storage, STORAGE_KEYS} from '../storage/mmkv';
import {
  scheduleTaskReminder,
  cancelTaskReminder,
} from '../utils/notifications';

interface TaskState {
  tasks: Task[];

  // Actions
  addTask: (text: string, dueTime?: string | null) => Promise<Task>;
  completeTask: (taskId: string) => void;
  uncompleteTask: (taskId: string) => void;
  removeTask: (taskId: string) => void;
  snoozeTask: (taskId: string, until: string) => Promise<void>;
  updateTaskText: (taskId: string, text: string) => void;
  updateTaskDueTime: (taskId: string, dueTime: string | null) => Promise<void>;
  refreshTasks: () => void;

  // Selectors
  getTodayTasks: () => Task[];
  getLaterTasks: () => Task[];
  getCompletedTodayTasks: () => Task[];
}

const getAllTasks = (): Task[] => {
  return storage.getObject<Task[]>(STORAGE_KEYS.TASKS) ?? [];
};

const saveTasks = (tasks: Task[]) => {
  storage.setObject(STORAGE_KEYS.TASKS, tasks);
};

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: getAllTasks(),

  addTask: async (text: string, dueTime?: string | null) => {
    const now = new Date();
    const task: Task = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text,
      createdAt: now.toISOString(),
      dateKey: getTodayDateKey(),
      dueTime: dueTime ?? null,
      completedAt: null,
      snoozedUntil: null,
      notificationId: null,
    };

    // Schedule reminder if due time is set
    if (dueTime) {
      const notifId = await scheduleTaskReminder(task.id, text, new Date(dueTime));
      if (notifId) task.notificationId = notifId;
    }

    const updated = [...get().tasks, task];
    saveTasks(updated);
    set({tasks: updated});
    return task;
  },

  completeTask: (taskId: string) => {
    const task = get().tasks.find(t => t.id === taskId);
    // Cancel any scheduled notification
    if (task?.notificationId) {
      cancelTaskReminder(task.notificationId);
    }
    const tasks = get().tasks.map(t =>
      t.id === taskId ? {...t, completedAt: new Date().toISOString(), notificationId: null} : t,
    );
    saveTasks(tasks);
    set({tasks});
  },

  uncompleteTask: (taskId: string) => {
    const tasks = get().tasks.map(t =>
      t.id === taskId ? {...t, completedAt: null} : t,
    );
    saveTasks(tasks);
    set({tasks});
  },

  removeTask: (taskId: string) => {
    const task = get().tasks.find(t => t.id === taskId);
    // Cancel any scheduled notification
    if (task?.notificationId) {
      cancelTaskReminder(task.notificationId);
    }
    const tasks = get().tasks.filter(t => t.id !== taskId);
    saveTasks(tasks);
    set({tasks});
  },

  snoozeTask: async (taskId: string, until: string) => {
    const task = get().tasks.find(t => t.id === taskId);
    // Cancel old notification
    if (task?.notificationId) {
      await cancelTaskReminder(task.notificationId);
    }
    // Schedule new notification for snooze time
    let newNotifId: string | null = null;
    if (task) {
      newNotifId = await scheduleTaskReminder(taskId, task.text, new Date(until));
    }
    const tasks = get().tasks.map(t =>
      t.id === taskId
        ? {
            ...t,
            snoozedUntil: until,
            dateKey: until.split('T')[0],
            notificationId: newNotifId,
          }
        : t,
    );
    saveTasks(tasks);
    set({tasks});
  },

  updateTaskText: (taskId: string, text: string) => {
    const tasks = get().tasks.map(t =>
      t.id === taskId ? {...t, text} : t,
    );
    saveTasks(tasks);
    set({tasks});
  },

  updateTaskDueTime: async (taskId: string, dueTime: string | null) => {
    const task = get().tasks.find(t => t.id === taskId);
    // Cancel old notification
    if (task?.notificationId) {
      await cancelTaskReminder(task.notificationId);
    }
    // Schedule new one if due time set
    let newNotifId: string | null = null;
    if (dueTime && task) {
      newNotifId = await scheduleTaskReminder(taskId, task.text, new Date(dueTime));
    }
    const tasks = get().tasks.map(t =>
      t.id === taskId ? {...t, dueTime, notificationId: newNotifId} : t,
    );
    saveTasks(tasks);
    set({tasks});
  },

  refreshTasks: () => {
    set({tasks: getAllTasks()});
  },

  getTodayTasks: () => {
    const todayKey = getTodayDateKey();
    const now = new Date();
    return get().tasks.filter(t => {
      if (t.completedAt) return false;
      // Show if it's today's task, or snoozed until now/past
      if (t.dateKey === todayKey) {
        if (t.snoozedUntil) {
          return new Date(t.snoozedUntil) <= now;
        }
        return true;
      }
      // Show past uncompleted tasks (carried forward)
      if (t.dateKey < todayKey) return true;
      return false;
    });
  },

  getLaterTasks: () => {
    const todayKey = getTodayDateKey();
    const now = new Date();
    return get().tasks.filter(t => {
      if (t.completedAt) return false;
      // Future tasks
      if (t.dateKey > todayKey) return true;
      // Snoozed to later today
      if (t.dateKey === todayKey && t.snoozedUntil) {
        return new Date(t.snoozedUntil) > now;
      }
      return false;
    });
  },

  getCompletedTodayTasks: () => {
    const todayKey = getTodayDateKey();
    return get().tasks.filter(t => {
      if (!t.completedAt) return false;
      const completedDate = t.completedAt.split('T')[0];
      return completedDate === todayKey;
    });
  },
}));
