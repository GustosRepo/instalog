/**
 * Task Store
 * Gentle day planner with optional reminders
 * No guilt, no urgency — just a calm place to plan your day
 */

import {create} from 'zustand';
import {Task, RecurrenceType, getTodayDateKey} from '../models/types';
import {storage, STORAGE_KEYS} from '../storage/mmkv';
import {
  scheduleTaskReminder,
  cancelTaskReminder,
} from '../utils/notifications';

interface TaskState {
  tasks: Task[];

  // Actions
  addTask: (text: string, dueTime?: string | null, durationMinutes?: number | null, wantsReminder?: boolean, recurrence?: RecurrenceType | null) => Promise<Task>;
  completeTask: (taskId: string) => void;
  uncompleteTask: (taskId: string) => void;
  removeTask: (taskId: string) => void;
  snoozeTask: (taskId: string, until: string) => Promise<void>;
  updateTaskText: (taskId: string, text: string) => void;
  updateTaskDueTime: (taskId: string, dueTime: string | null) => Promise<void>;
  updateTask: (taskId: string, text: string, dueTime: string | null, durationMinutes: number | null, wantsReminder: boolean, recurrence?: RecurrenceType | null) => Promise<void>;
  spawnRecurringTasks: () => Promise<void>;
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

  addTask: async (text: string, dueTime?: string | null, durationMinutes?: number | null, wantsReminder?: boolean, recurrence?: RecurrenceType | null) => {
    const now = new Date();
    const todayKey = getTodayDateKey();

    // If recurring, first save the template (hidden master)
    if (recurrence) {
      const template: Task = {
        id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        text,
        createdAt: now.toISOString(),
        dateKey: todayKey,
        dueTime: dueTime ?? null,
        durationMinutes: durationMinutes ?? null,
        completedAt: null,
        snoozedUntil: null,
        notificationId: null,
        recurrence,
        isRecurringTemplate: true,
        recurringTemplateId: null,
      };
      // Also spawn today's instance immediately
      const instance: Task = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        text,
        createdAt: now.toISOString(),
        dateKey: todayKey,
        dueTime: dueTime ?? null,
        durationMinutes: durationMinutes ?? null,
        completedAt: null,
        snoozedUntil: null,
        notificationId: null,
        recurrence: null,
        isRecurringTemplate: false,
        recurringTemplateId: template.id,
      };
      if (dueTime && wantsReminder) {
        const notifId = await scheduleTaskReminder(instance.id, text, new Date(dueTime));
        if (notifId) instance.notificationId = notifId;
      }
      const updated = [...get().tasks, template, instance];
      saveTasks(updated);
      set({tasks: updated});
      return instance;
    }

    const task: Task = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text,
      createdAt: now.toISOString(),
      dateKey: todayKey,
      dueTime: dueTime ?? null,
      durationMinutes: durationMinutes ?? null,
      completedAt: null,
      snoozedUntil: null,
      notificationId: null,
      recurrence: null,
      isRecurringTemplate: false,
      recurringTemplateId: null,
    };

    // Schedule reminder only if explicitly requested
    if (dueTime && wantsReminder) {
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

  updateTask: async (taskId: string, text: string, dueTime: string | null, durationMinutes: number | null, wantsReminder: boolean, recurrence?: RecurrenceType | null) => {
    const task = get().tasks.find(t => t.id === taskId);
    // Cancel existing notification
    if (task?.notificationId) {
      await cancelTaskReminder(task.notificationId);
    }
    // Schedule new notification if requested
    let newNotifId: string | null = null;
    if (dueTime && wantsReminder) {
      newNotifId = await scheduleTaskReminder(taskId, text, new Date(dueTime));
    }
    // If this task has a recurring template, update the template too
    let updatedTasks = get().tasks.map(t =>
      t.id === taskId ? {...t, text, dueTime, durationMinutes, notificationId: newNotifId} : t,
    );
    if (task?.recurringTemplateId) {
      updatedTasks = updatedTasks.map(t =>
        t.id === task.recurringTemplateId
          ? {...t, text, dueTime, durationMinutes, recurrence: recurrence ?? t.recurrence}
          : t,
      );
    }
    saveTasks(updatedTasks);
    set({tasks: updatedTasks});
  },

  spawnRecurringTasks: async () => {
    const todayKey = getTodayDateKey();
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon…6=Sat
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const allTasks = get().tasks;
    const templates = allTasks.filter(t => t.isRecurringTemplate);
    const todaySpawnedTemplateIds = new Set(
      allTasks
        .filter(t => t.dateKey === todayKey && t.recurringTemplateId)
        .map(t => t.recurringTemplateId!),
    );

    const newInstances: Task[] = [];

    for (const template of templates) {
      // Skip if already spawned today
      if (todaySpawnedTemplateIds.has(template.id)) continue;

      // Check if recurrence applies today
      const applies =
        template.recurrence === 'daily' ||
        (template.recurrence === 'weekdays' && isWeekday) ||
        (template.recurrence === 'weekends' && isWeekend);

      if (!applies) continue;

      // Build today's due time from template's time-of-day
      let todayDueTime: string | null = null;
      if (template.dueTime) {
        const templateDate = new Date(template.dueTime);
        const spawned = new Date(today);
        spawned.setHours(templateDate.getHours(), templateDate.getMinutes(), 0, 0);
        todayDueTime = spawned.toISOString();
      }

      const instance: Task = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        text: template.text,
        createdAt: today.toISOString(),
        dateKey: todayKey,
        dueTime: todayDueTime,
        durationMinutes: template.durationMinutes ?? null,
        completedAt: null,
        snoozedUntil: null,
        notificationId: null,
        recurrence: null,
        isRecurringTemplate: false,
        recurringTemplateId: template.id,
      };

      // Schedule notification if template had a time and notification
      if (todayDueTime) {
        const notifId = await scheduleTaskReminder(instance.id, instance.text, new Date(todayDueTime));
        if (notifId) instance.notificationId = notifId;
      }

      newInstances.push(instance);
    }

    if (newInstances.length > 0) {
      const updated = [...get().tasks, ...newInstances];
      saveTasks(updated);
      set({tasks: updated});
    }
  },

  refreshTasks: () => {
    set({tasks: getAllTasks()});
  },

  getTodayTasks: () => {
    const todayKey = getTodayDateKey();
    const now = new Date();
    return get().tasks.filter(t => {
      if (t.isRecurringTemplate) return false;
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
      if (t.isRecurringTemplate) return false;
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
      if (t.isRecurringTemplate) return false;
      if (!t.completedAt) return false;
      const completedDate = t.completedAt.split('T')[0];
      return completedDate === todayKey;
    });
  },
}));
