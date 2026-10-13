import { useEffect, useState, useSyncExternalStore } from 'react';
import { loadPersona, loadGrowth } from './aiTeacherStorage';
import { teacherSettingsRepository } from '../services/teacherSettingsService';
import { TeacherSettingsController, emptyTeacherSettings, type TeacherSettingsState } from './teacherSettings';

export function useTeacherSettings(userId: string | null | undefined) {
  const [controller] = useState(() => new TeacherSettingsController(teacherSettingsRepository, {
    load: () => ({ persona: loadPersona(), prefs: loadGrowth().prefs }),
    save: value => {
      // Surface browser storage failures instead of reporting a successful save.
      const previousPersona = localStorage.getItem('yogaTeacher'), previousGrowth = localStorage.getItem('yogaGrowth');
      try {
        localStorage.setItem('yogaGrowth', JSON.stringify({ ...loadGrowth(), prefs: value.prefs }));
        if (value.persona) localStorage.setItem('yogaTeacher', JSON.stringify(value.persona)); else localStorage.removeItem('yogaTeacher');
      } catch (error) {
        try {
          if (previousPersona === null) localStorage.removeItem('yogaTeacher'); else localStorage.setItem('yogaTeacher', previousPersona);
          if (previousGrowth === null) localStorage.removeItem('yogaGrowth'); else localStorage.setItem('yogaGrowth', previousGrowth);
        } catch { /* Preserve the save failure even when storage is unavailable for rollback. */ }
        throw error;
      }
    },
  }));
  const snapshot = useSyncExternalStore(controller.subscribe, controller.snapshot, controller.snapshot);
  useEffect(() => { void controller.switchOwner(userId); return () => controller.dispose(); }, [controller, userId]);
  const state: TeacherSettingsState = snapshot.owner === userId ? snapshot : {
    owner: userId, settings: emptyTeacherSettings(), revision: null, status: 'loading', message: null,
  };
  return { ...state, save: controller.save.bind(controller), reload: () => controller.switchOwner(userId) };
}
