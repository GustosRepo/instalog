/**
 * Tasks Screen - Clock Day Planner
 *
 * A clock face where tasks with due times appear as colored arcs.
 * Tasks without times listed below. Calm, visual, intuitive.
 */

import React, {useState, useRef, useCallback, useMemo} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Keyboard,
  Alert,
  Platform,
  Animated,
  KeyboardAvoidingView,
  Dimensions,
  Image,
  Modal,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Svg, {Circle, Path, Line, Text as SvgText} from 'react-native-svg';
import DateTimePicker from '@react-native-community/datetimepicker';
import Slider from '@react-native-community/slider';
import {useNavigation} from '@react-navigation/native';
import {useTaskStore} from '../stores/useTaskStore';
import {useSubscriptionStore} from '../stores/useSubscriptionStore';
import {Task, RecurrenceType, formatTime} from '../models/types';
import {Haptics} from '../utils/haptics';
import {requestNotificationPermission} from '../utils/notifications';
import {MOODS} from '../utils/moods';
import {useTranslation} from 'react-i18next';

// Arc colors for tasks — soft, distinguishable palette
const ARC_COLORS = [
  '#6E6AF2', // purple (primary)
  '#F29B6E', // warm orange
  '#6EE0F2', // cyan
  '#F26EAF', // pink
  '#6EF2A8', // mint
  '#F2E06E', // soft yellow
  '#A86EF2', // lavender
  '#F26E6E', // coral
];

import {CONTENT_MAX_WIDTH} from '../utils/layout';

const CLOCK_SIZE = Math.min(Dimensions.get('window').width - 80, CONTENT_MAX_WIDTH - 80);
const CENTER = CLOCK_SIZE / 2;
const CLOCK_RADIUS = CLOCK_SIZE / 2 - 20;
const ARC_RADIUS_PM = CLOCK_RADIUS - 10; // outer ring = PM (close to edge)
const ARC_RADIUS_AM = CLOCK_RADIUS - 38; // inner ring = AM (clearly separated)
const RING_DIVIDER_RADIUS = (ARC_RADIUS_PM + ARC_RADIUS_AM) / 2;
const HOUR_MARK_OUTER = CLOCK_RADIUS - 4;
const HOUR_MARK_INNER = CLOCK_RADIUS - 16;
const HOUR_LABEL_RADIUS = CLOCK_RADIUS - 30;

// Convert hours (0-12) to angle in radians (12 o'clock = top = -PI/2)
const hourToAngle = (hours: number): number => {
  return ((hours / 12) * 2 * Math.PI) - (Math.PI / 2);
};

// Get hour position (0-12) from an ISO time string
const getClockHour = (isoString: string): number => {
  const date = new Date(isoString);
  const h = date.getHours() % 12;
  const m = date.getMinutes();
  return h + m / 60;
};

// Create SVG arc path
const describeArc = (
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
): string => {
  const start = {
    x: cx + r * Math.cos(startAngle),
    y: cy + r * Math.sin(startAngle),
  };
  const end = {
    x: cx + r * Math.cos(endAngle),
    y: cy + r * Math.sin(endAngle),
  };
  const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;

  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
};

// Clock Face Component
const ClockFace: React.FC<{
  tasks: Task[];
  onTaskPress: (task: Task) => void;
}> = ({tasks, onTaskPress}) => {
  const now = new Date();
  const currentHour = (now.getHours() % 12) + now.getMinutes() / 60;
  const isAM = now.getHours() < 12;

  // Current time hand angle
  const handAngle = hourToAngle(currentHour);
  const handLength = CLOCK_RADIUS - 40;
  const handEndX = CENTER + handLength * Math.cos(handAngle);
  const handEndY = CENTER + handLength * Math.sin(handAngle);

  // Tasks with due times for arcs
  const timedTasks = tasks.filter(t => t.dueTime && !t.completedAt);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Assign colors globally so each task has a unique color across AM+PM
  const taskColors: Record<string, string> = {};
  timedTasks.forEach((t, i) => {
    taskColors[t.id] = ARC_COLORS[i % ARC_COLORS.length];
  });

  const amTasks = timedTasks.filter(t => new Date(t.dueTime!).getHours() < 12);
  const pmTasks = timedTasks.filter(t => new Date(t.dueTime!).getHours() >= 12);

  const renderArcs = (arcTasks: Task[], radius: number) =>
    arcTasks.map(task => {
      const taskHour = getClockHour(task.dueTime!);
      // Use actual duration if set, otherwise default to 30 min
      const spanHours = task.durationMinutes ? task.durationMinutes / 60 : 0.5;
      const startAngle = hourToAngle(taskHour);
      const endAngle = hourToAngle(taskHour + spanHours);
      const color = taskColors[task.id];
      const arcPath = describeArc(CENTER, CENTER, radius, startAngle, endAngle);
      const isSelected = selectedTaskId === task.id;
      const isOtherSelected = selectedTaskId !== null && !isSelected;
      return (
        <Path
          key={task.id}
          d={arcPath}
          stroke={color}
          strokeWidth={isSelected ? 11 : 7}
          strokeLinecap="round"
          fill="none"
          opacity={isSelected ? 1 : isOtherSelected ? 0.2 : 0.9}
          onPress={() => {
            setSelectedTaskId(isSelected ? null : task.id);
            onTaskPress(task);
          }}
        />
      );
    });

  return (
    <View style={{alignItems: 'center', marginBottom: 16}}>
      <View style={{position: 'relative'}}>
        <Svg width={CLOCK_SIZE} height={CLOCK_SIZE}>
          {/* Clock background */}
          <Circle
            cx={CENTER}
            cy={CENTER}
            r={CLOCK_RADIUS}
            fill="#141821"
            stroke="#2A2D34"
            strokeWidth={1.5}
          />

          {/* Ring divider — dashed circle between AM and PM zones */}
          <Circle
            cx={CENTER}
            cy={CENTER}
            r={RING_DIVIDER_RADIUS}
            fill="none"
            stroke="#2A2D34"
            strokeWidth={1}
            strokeDasharray="4 8"
            opacity={0.6}
          />

          {/* Hour marks and labels */}
          {Array.from({length: 12}, (_, i) => {
            const hour = i === 0 ? 12 : i;
            const angle = hourToAngle(i);
            const outerX = CENTER + HOUR_MARK_OUTER * Math.cos(angle);
            const outerY = CENTER + HOUR_MARK_OUTER * Math.sin(angle);
            const innerX = CENTER + HOUR_MARK_INNER * Math.cos(angle);
            const innerY = CENTER + HOUR_MARK_INNER * Math.sin(angle);
            const labelX = CENTER + HOUR_LABEL_RADIUS * Math.cos(angle);
            const labelY = CENTER + HOUR_LABEL_RADIUS * Math.sin(angle);

            return (
              <React.Fragment key={i}>
                <Line
                  x1={innerX}
                  y1={innerY}
                  x2={outerX}
                  y2={outerY}
                  stroke="#3A3D44"
                  strokeWidth={i % 3 === 0 ? 2 : 1}
                />
                <SvgText
                  x={labelX}
                  y={labelY + 4}
                  fill="#4B5563"
                  fontSize={11}
                  fontWeight={i % 3 === 0 ? '600' : '400'}
                  textAnchor="middle">
                  {hour}
                </SvgText>
              </React.Fragment>
            );
          })}

          {/* PM arcs — outer ring */}
          {renderArcs(pmTasks, ARC_RADIUS_PM)}

          {/* AM arcs — inner ring */}
          {renderArcs(amTasks, ARC_RADIUS_AM)}

          {/* Center dot */}
          <Circle cx={CENTER} cy={CENTER} r={4} fill="#6E6AF2" />

          {/* Current time hand */}
          <Line
            x1={CENTER}
            y1={CENTER}
            x2={handEndX}
            y2={handEndY}
            stroke="#6E6AF2"
            strokeWidth={2}
            strokeLinecap="round"
          />

          {/* Current time AM/PM */}
          <SvgText
            x={CENTER}
            y={CENTER + 26}
            fill="#4B5563"
            fontSize={10}
            fontWeight="500"
            textAnchor="middle">
            {isAM ? 'AM' : 'PM'}
          </SvgText>
        </Svg>

        {/* AM badge — top left corner, inside clock */}
        {amTasks.length > 0 && (
          <View style={{
            position: 'absolute',
            top: 20,
            left: 20,
            backgroundColor: 'rgba(30,33,42,0.9)',
            borderRadius: 6,
            paddingHorizontal: 7,
            paddingVertical: 3,
            borderWidth: 1,
            borderColor: '#2A2D34',
          }}>
            <Text style={{color: '#6B7280', fontSize: 9, fontWeight: '700', letterSpacing: 1}}>AM</Text>
          </View>
        )}

        {/* PM badge — top right corner, inside clock */}
        {pmTasks.length > 0 && (
          <View style={{
            position: 'absolute',
            top: 20,
            right: 20,
            backgroundColor: 'rgba(30,33,42,0.9)',
            borderRadius: 6,
            paddingHorizontal: 7,
            paddingVertical: 3,
            borderWidth: 1,
            borderColor: '#2A2D34',
          }}>
            <Text style={{color: '#6B7280', fontSize: 9, fontWeight: '700', letterSpacing: 1}}>PM</Text>
          </View>
        )}
      </View>

      {/* Legend grouped by AM / PM */}
      {timedTasks.length > 0 && (
        <View style={{marginTop: 4, paddingHorizontal: 16, width: '100%'}}>
          {amTasks.length > 0 && (
            <>
              <Text style={{color: '#374151', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 2, marginTop: 4}}>AM</Text>
              {amTasks.map(task => {
                const color = taskColors[task.id];
                const isSelected = selectedTaskId === task.id;
                return (
                  <TouchableOpacity
                    key={task.id}
                    onPress={() => {
                      setSelectedTaskId(isSelected ? null : task.id);
                      onTaskPress(task);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 6,
                      opacity: selectedTaskId !== null && !isSelected ? 0.4 : 1,
                    }}>
                    <View style={{width: isSelected ? 12 : 10, height: isSelected ? 12 : 10, borderRadius: 6, backgroundColor: color, marginRight: 10}} />
                    <Text style={{color: '#EDEEF0', fontSize: 14, flex: 1, fontWeight: isSelected ? '600' : '400'}} numberOfLines={1}>{task.text}</Text>
                    <Text style={{color: isSelected ? color : '#9AA0A6', fontSize: 12}}>{formatTime(task.dueTime!)}</Text>
                  </TouchableOpacity>
                );
              })}
            </>
          )}
          {pmTasks.length > 0 && (
            <>
              <Text style={{color: '#374151', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginTop: amTasks.length > 0 ? 6 : 4, marginBottom: 2}}>PM</Text>
              {pmTasks.map(task => {
                const color = taskColors[task.id];
                const isSelected = selectedTaskId === task.id;
                return (
                  <TouchableOpacity
                    key={task.id}
                    onPress={() => {
                      setSelectedTaskId(isSelected ? null : task.id);
                      onTaskPress(task);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 6,
                      opacity: selectedTaskId !== null && !isSelected ? 0.4 : 1,
                    }}>
                    <View style={{width: isSelected ? 12 : 10, height: isSelected ? 12 : 10, borderRadius: 6, backgroundColor: color, marginRight: 10}} />
                    <Text style={{color: '#EDEEF0', fontSize: 14, flex: 1, fontWeight: isSelected ? '600' : '400'}} numberOfLines={1}>{task.text}</Text>
                    <Text style={{color: isSelected ? color : '#9AA0A6', fontSize: 12}}>{formatTime(task.dueTime!)}</Text>
                  </TouchableOpacity>
                );
              })}
            </>
          )}
        </View>
      )}
    </View>
  );
};

// Task Item Component
interface TaskItemProps {
  task: Task;
  onComplete: (id: string) => void;
  onSnooze1h: (id: string) => void;
  onSnoozeTomorrow: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
  isCompleted?: boolean;
  onUncomplete?: (id: string) => void;
  color?: string;
}

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onComplete,
  onSnooze1h,
  onSnoozeTomorrow,
  onDelete,
  onEdit,
  isCompleted,
  onUncomplete,
  color,
}) => {
  const {t} = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const handleComplete = () => {
    Haptics.success();
    Animated.timing(fadeAnim, {
      toValue: 0.3,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onComplete(task.id);
    });
  };

  return (
    <Animated.View style={{opacity: fadeAnim}}>
      <TouchableOpacity
        onPress={() => !isCompleted && setExpanded(!expanded)}
        activeOpacity={0.7}
        style={{
          backgroundColor: '#141821',
          borderRadius: 12,
          paddingVertical: 14,
          paddingHorizontal: 16,
          marginBottom: 8,
          borderLeftWidth: color ? 3 : 0,
          borderLeftColor: color || 'transparent',
        }}>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          {/* Checkbox */}
          <TouchableOpacity
            onPress={
              isCompleted && onUncomplete
                ? () => onUncomplete(task.id)
                : handleComplete
            }
            hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}
            style={{marginRight: 12}}>
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                borderWidth: 2,
                borderColor: isCompleted
                  ? '#6E6AF2'
                  : color || '#3A3D44',
                backgroundColor: isCompleted ? '#6E6AF2' : 'transparent',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
              {isCompleted && (
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: 12,
                    fontWeight: '700',
                  }}>
                  ✓
                </Text>
              )}
            </View>
          </TouchableOpacity>

          {/* Task text */}
          <View style={{flex: 1}}>
            <Text
              style={{
                color: isCompleted ? '#6B7280' : '#EDEEF0',
                fontSize: 16,
                textDecorationLine: isCompleted ? 'line-through' : 'none',
                lineHeight: 22,
              }}>
              {task.text}
            </Text>
            {task.dueTime && !isCompleted && (
              <Text style={{color: '#9AA0A6', fontSize: 12, marginTop: 2}}>
                🕐 {formatTime(task.dueTime)}{task.durationMinutes ? ` · ${task.durationMinutes < 60 ? `${task.durationMinutes}m` : `${task.durationMinutes / 60}h`}` : ''}{task.notificationId ? ' · 🔔' : ''}{task.recurringTemplateId ? ' · 🔁' : ''}
              </Text>
            )}
          </View>
        </View>

        {/* Quick actions (expanded) */}
        {expanded && !isCompleted && (
          <View
            style={{
              flexDirection: 'row',
              marginTop: 12,
              paddingTop: 12,
              borderTopWidth: 1,
              borderTopColor: 'rgba(154, 160, 166, 0.1)',
              gap: 8,
            }}>
            <TouchableOpacity
              onPress={() => {
                onSnooze1h(task.id);
                setExpanded(false);
              }}
              style={{
                flex: 1,
                backgroundColor: '#1A1D24',
                paddingVertical: 10,
                borderRadius: 8,
                alignItems: 'center',
              }}>
              <Text style={{color: '#9AA0A6', fontSize: 13, fontWeight: '500'}}>
                {t('tasks.actionLater')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                onSnoozeTomorrow(task.id);
                setExpanded(false);
              }}
              style={{
                flex: 1,
                backgroundColor: '#1A1D24',
                paddingVertical: 10,
                borderRadius: 8,
                alignItems: 'center',
              }}>
              <Text style={{color: '#9AA0A6', fontSize: 13, fontWeight: '500'}}>
                {t('tasks.actionTomorrow')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setExpanded(false);
                onEdit(task);
              }}
              style={{
                flex: 1,
                backgroundColor: '#1A1D24',
                paddingVertical: 10,
                borderRadius: 8,
                alignItems: 'center',
              }}>
              <Text style={{color: '#6E6AF2', fontSize: 13, fontWeight: '500'}}>
                {t('tasks.actionEdit')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                onDelete(task.id);
                setExpanded(false);
              }}
              style={{
                flex: 1,
                backgroundColor: '#1A1D24',
                paddingVertical: 10,
                borderRadius: 8,
                alignItems: 'center',
              }}>
              <Text style={{color: '#EF4444', fontSize: 13, fontWeight: '500'}}>
                {t('tasks.actionRemove')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const TasksScreen: React.FC = () => {
  const {t} = useTranslation();
  const [newTaskText, setNewTaskText] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState<Date | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [wantsReminder, setWantsReminder] = useState(false);
  const [selectedRecurrence, setSelectedRecurrence] = useState<RecurrenceType | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editText, setEditText] = useState('');
  const [editTime, setEditTime] = useState<Date | null>(null);
  const [editDuration, setEditDuration] = useState<number | null>(null);
  const [editWantsReminder, setEditWantsReminder] = useState(false);
  const [editRecurrence, setEditRecurrence] = useState<RecurrenceType | null>(null);
  const [showEditTimePicker, setShowEditTimePicker] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastMood, setToastMood] = useState<keyof typeof MOODS | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);
  const navigation = useNavigation<any>();
  const isPro = useSubscriptionStore(state => state.isPro);

  const {
    addTask,
    completeTask,
    uncompleteTask,
    removeTask,
    snoozeTask,
    updateTask,
    getTodayTasks,
    getLaterTasks,
    getCompletedTodayTasks,
  } = useTaskStore();

  const todayTasks = getTodayTasks();
  const laterTasks = getLaterTasks();
  const completedTasks = getCompletedTodayTasks();

  // Split today tasks: timed vs untimed
  const timedTasks = useMemo(
    () => todayTasks.filter(t => t.dueTime),
    [todayTasks],
  );
  const untimedTasks = useMemo(
    () => todayTasks.filter(t => !t.dueTime),
    [todayTasks],
  );

  // Build color map for timed tasks
  const taskColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    timedTasks.forEach((t, i) => {
      map[t.id] = ARC_COLORS[i % ARC_COLORS.length];
    });
    return map;
  }, [timedTasks]);

  const showToast = useCallback(
    (message: string, mood?: keyof typeof MOODS) => {
      setToastMessage(message);
      setToastMood(mood ?? null);
      toastOpacity.setValue(0);
      Animated.sequence([
        Animated.timing(toastOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.delay(1800),
        Animated.timing(toastOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setToastMessage(null);
        setToastMood(null);
      });
    },
    [toastOpacity],
  );

  const handleAddTask = async () => {
    const trimmed = newTaskText.trim();
    if (!trimmed) return;

    const dueTime = selectedTime ? selectedTime.toISOString() : null;
    await addTask(trimmed, dueTime, selectedDuration, wantsReminder, selectedRecurrence);

    Haptics.light();
    setNewTaskText('');
    setSelectedTime(null);
    setSelectedDuration(null);
    setWantsReminder(false);
    setSelectedRecurrence(null);
    setShowTimePicker(false);
    Keyboard.dismiss();
  };

  const handleComplete = (id: string) => {
    completeTask(id);
    showToast(t('tasks.toastDone'), 'cheerful');
  };

  const handleSnooze1h = (id: string) => {
    const snoozeTo = new Date(Date.now() + 60 * 60 * 1000);
    snoozeTask(id, snoozeTo.toISOString());
    Haptics.light();
    showToast(t('tasks.toastSnooze1h'), 'upset');
  };

  const handleSnoozeTomorrow = (id: string) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    snoozeTask(id, tomorrow.toISOString());
    Haptics.light();
    showToast(t('tasks.toastSnoozeTomorrow'), 'upset');
  };

  const handleDelete = (id: string) => {
    Alert.alert(t('tasks.deleteAlertTitle'), t('tasks.deleteAlertMessage'), [
      {text: t('tasks.deleteAlertKeep'), style: 'cancel'},
      {
        text: t('tasks.deleteAlertConfirm'),
        style: 'destructive',
        onPress: () => {
          removeTask(id);
          Haptics.light();
        },
      },
    ]);
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setEditText(task.text);
    setEditTime(task.dueTime ? new Date(task.dueTime) : null);
    setEditDuration(task.durationMinutes ?? null);
    setEditWantsReminder(!!task.notificationId);
    // Load recurrence from template if this is a spawned instance
    setEditRecurrence(task.recurrence ?? null);
    setShowEditTimePicker(!!task.dueTime);
  };

  const handleSaveEdit = async () => {
    if (!editingTask || !editText.trim()) return;
    await updateTask(
      editingTask.id,
      editText.trim(),
      editTime ? editTime.toISOString() : null,
      editDuration,
      editWantsReminder,
      editRecurrence,
    );
    Haptics.light();
    setEditingTask(null);
  };

  const handleTimeChange = (_event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (date) {
      setSelectedTime(date);
    }
  };

  const handleClockTaskPress = (task: Task) => {
    // Scroll to task or highlight it — for now just show a toast with the time
    Haptics.light();
    showToast(`${task.text} — ${formatTime(task.dueTime!)}`);
  };

  const allEmpty =
    todayTasks.length === 0 &&
    laterTasks.length === 0 &&
    completedTasks.length === 0;

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#0B0D10'}}>
      {/* Edit Task Modal */}
      <Modal
        visible={!!editingTask}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditingTask(null)}>
        <KeyboardAvoidingView
          style={{flex: 1, backgroundColor: '#0B0D10'}}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={{flex: 1, padding: 24}}>
            {/* Header */}
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24}}>
              <Text style={{color: '#EDEEF0', fontSize: 20, fontWeight: '700'}}>{t('tasks.editModalTitle')}</Text>
              <TouchableOpacity onPress={() => setEditingTask(null)}>
                <Text style={{color: '#9AA0A6', fontSize: 16}}>{t('tasks.editModalCancel')}</Text>
              </TouchableOpacity>
            </View>

            {/* Text */}
            <Text style={{color: '#9AA0A6', fontSize: 13, fontWeight: '600', marginBottom: 8, letterSpacing: 0.5}}>{t('tasks.editTaskSectionLabel')}</Text>
            <TextInput
              value={editText}
              onChangeText={setEditText}
              placeholder={t('tasks.editTaskPlaceholder')}
              placeholderTextColor="#4B5563"
              multiline
              style={{
                backgroundColor: '#141821',
                borderRadius: 12,
                padding: 14,
                color: '#EDEEF0',
                fontSize: 16,
                marginBottom: 24,
                minHeight: 80,
              }}
            />

            {/* Schedule toggle */}
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12}}>
              <Text style={{color: '#9AA0A6', fontSize: 13, fontWeight: '600', letterSpacing: 0.5}}>{t('tasks.editScheduleSectionLabel')}</Text>
              <TouchableOpacity
                onPress={() => {
                  if (showEditTimePicker) {
                    setShowEditTimePicker(false);
                    setEditTime(null);
                    setEditDuration(null);
                    setEditWantsReminder(false);
                  } else {
                    setShowEditTimePicker(true);
                  }
                }}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                  borderRadius: 20,
                  backgroundColor: showEditTimePicker ? 'rgba(110,106,242,0.15)' : '#1A1D24',
                  borderWidth: 1,
                  borderColor: showEditTimePicker ? '#6E6AF2' : '#2A2D34',
                }}>
                <Text style={{color: showEditTimePicker ? '#6E6AF2' : '#9AA0A6', fontSize: 13}}>
                  {showEditTimePicker ? t('tasks.editScheduleClear') : t('tasks.editScheduleAddTime')}
                </Text>
              </TouchableOpacity>
            </View>

            {showEditTimePicker && (
              <View style={{backgroundColor: '#141821', borderRadius: 12, padding: 14, marginBottom: 16}}>
                <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12}}>
                  <Text style={{color: '#9AA0A6', fontSize: 14}}>{t('tasks.editStartTimeLabel')}</Text>
                  <DateTimePicker
                    value={editTime ?? new Date()}
                    mode="time"
                    display="compact"
                    onChange={(_e, date) => date && setEditTime(date)}
                    themeVariant="dark"
                  />
                </View>
                {/* Duration slider */}
                <Text style={{color: '#6B7280', fontSize: 12, marginBottom: 4}}>{t('tasks.editDurationLabel')}</Text>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2}}>
                  <Text style={{color: '#6B7280', fontSize: 11}}>none — 12h</Text>
                  <Text style={{color: editDuration ? '#EDEEF0' : '#4B5563', fontSize: 14, fontWeight: '600'}}>
                    {editDuration
                      ? editDuration < 60 ? `${editDuration}m` : `${editDuration / 60}h`
                      : t('tasks.editDurationNone')}
                  </Text>
                </View>
                <Slider
                  style={{width: '100%', height: 36, marginBottom: 4}}
                  minimumValue={0}
                  maximumValue={14}
                  step={1}
                  value={editDuration ? [null,15,30,60,120,180,240,300,360,420,480,540,600,660,720].indexOf(editDuration) : 0}
                  onValueChange={idx => {
                    const steps = [null,15,30,60,120,180,240,300,360,420,480,540,600,660,720];
                    setEditDuration(steps[idx] as number | null);
                  }}
                  minimumTrackTintColor="#6E6AF2"
                  maximumTrackTintColor="#2A2D34"
                  thumbTintColor="#6E6AF2"
                />
                {/* Reminder toggle */}
                <TouchableOpacity
                  onPress={async () => {
                    if (!editWantsReminder) {
                      const granted = await requestNotificationPermission();
                      if (!granted) {
                        Alert.alert(t('tasks.remindersOffAlertTitle'), t('tasks.remindersOffAlertMessage'), [{text: t('tasks.remindersOffAlertButton')}]);
                        return;
                      }
                    }
                    setEditWantsReminder(!editWantsReminder);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    paddingVertical: 6,
                  }}>
                  <View style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    borderWidth: 1.5,
                    borderColor: editWantsReminder ? '#6E6AF2' : '#3A3D44',
                    backgroundColor: editWantsReminder ? '#6E6AF2' : 'transparent',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    {editWantsReminder && <Text style={{color: '#FFF', fontSize: 12, fontWeight: '700'}}>✓</Text>}
                  </View>
                  <Text style={{color: editWantsReminder ? '#EDEEF0' : '#9AA0A6', fontSize: 14}}>{t('tasks.editNotifyToggle')}</Text>
                </TouchableOpacity>
                {/* Recurrence picker */}
                <View style={{marginTop: 16}}>
                  <Text style={{color: '#9AA0A6', fontSize: 11, marginBottom: 6, fontWeight: '500', letterSpacing: 0.5}}>{t('tasks.editRepeatLabel')}</Text>
                  <View style={{flexDirection: 'row', gap: 6}}>
                    {([null, 'daily', 'weekdays', 'weekends'] as (RecurrenceType | null)[]).map(opt => {
                      const label = opt === null ? t('tasks.repeatNone') : opt === 'daily' ? t('tasks.repeatDaily') : opt === 'weekdays' ? t('tasks.repeatWeekdays') : t('tasks.repeatWeekends');
                      const active = editRecurrence === opt;
                      return (
                        <TouchableOpacity
                          key={String(opt)}
                          onPress={() => setEditRecurrence(opt)}
                          style={{
                            flex: 1,
                            paddingVertical: 6,
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: active ? '#6E6AF2' : '#2A2D34',
                            backgroundColor: active ? 'rgba(110,106,242,0.15)' : 'transparent',
                            alignItems: 'center',
                          }}>
                          <Text style={{color: active ? '#6E6AF2' : '#9AA0A6', fontSize: 12, fontWeight: active ? '600' : '400'}}>{label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>
            )}

            <View style={{flex: 1}} />

            {/* Save button */}
            <TouchableOpacity
              onPress={handleSaveEdit}
              disabled={!editText.trim()}
              style={{
                backgroundColor: editText.trim() ? '#6E6AF2' : '#1A1D24',
                borderRadius: 14,
                paddingVertical: 16,
                alignItems: 'center',
              }}>
              <Text style={{color: editText.trim() ? '#FFF' : '#4B5563', fontSize: 16, fontWeight: '600'}}>{t('tasks.editSaveButton')}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <KeyboardAvoidingView
        style={{flex: 1}}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}>
        {/* Header */}
        <View
          style={{
            paddingHorizontal: 24,
            paddingTop: 16,
            paddingBottom: 8,
          }}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
            <Text
              style={{
                color: '#EDEEF0',
                fontSize: 28,
                fontWeight: '700',
              }}>
              {t('tasks.screenTitle')}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Settings')} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
              <Text style={{fontSize: 20, opacity: 0.7}}>⚙️</Text>
            </TouchableOpacity>
          </View>
          <Text style={{color: '#9AA0A6', fontSize: 14, marginTop: 2}}>
            {t('tasks.screenSubtitle')}
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{paddingHorizontal: 16, paddingBottom: 16}}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Clock — Pro only */}
          {!allEmpty && isPro && <ClockFace tasks={todayTasks} onTaskPress={handleClockTaskPress} />}

          {/* Clock upsell for free users */}
          {!allEmpty && !isPro && timedTasks.length > 0 && (
            <TouchableOpacity
              onPress={() => navigation.navigate('Paywall', {feature: t('tasks.clockViewUpsellTitle')})}
              style={{
                backgroundColor: '#141821',
                borderRadius: 16,
                padding: 24,
                marginBottom: 16,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#6E6AF2',
                borderStyle: 'dashed',
              }}>
              <Text style={{fontSize: 32, marginBottom: 8}}>🕐</Text>
              <Text style={{color: '#EDEEF0', fontSize: 16, fontWeight: '600', marginBottom: 4}}>
                {t('tasks.clockViewUpsellTitle')}
              </Text>
              <Text style={{color: '#9AA0A6', fontSize: 13, textAlign: 'center'}}>
                {t('tasks.clockViewUpsellText')}
              </Text>
            </TouchableOpacity>
          )}

          {/* Untimed tasks */}
          {untimedTasks.length > 0 && (
            <View style={{marginBottom: 16}}>
              <Text
                style={{
                  color: '#9AA0A6',
                  fontSize: 13,
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  marginBottom: 8,
                  paddingHorizontal: 4,
                }}>
                {t('tasks.sectionToday')}
              </Text>
              {untimedTasks.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onComplete={handleComplete}
                  onSnooze1h={handleSnooze1h}
                  onSnoozeTomorrow={handleSnoozeTomorrow}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                />
              ))}
            </View>
          )}

          {/* Timed tasks list (matches clock arcs) */}
          {timedTasks.length > 0 && (
            <View style={{marginBottom: 16}}>
              <Text
                style={{
                  color: '#9AA0A6',
                  fontSize: 13,
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  marginBottom: 8,
                  paddingHorizontal: 4,
                }}>
                {t('tasks.sectionScheduled')}
              </Text>
              {timedTasks.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onComplete={handleComplete}
                  onSnooze1h={handleSnooze1h}
                  onSnoozeTomorrow={handleSnoozeTomorrow}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                  color={taskColorMap[task.id]}
                />
              ))}
            </View>
          )}

          {/* Later section */}
          {laterTasks.length > 0 && (
            <View style={{marginBottom: 16}}>
              <Text
                style={{
                  color: '#9AA0A6',
                  fontSize: 13,
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  marginBottom: 8,
                  paddingHorizontal: 4,
                }}>
                {t('tasks.sectionLater')}
              </Text>
              {laterTasks.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onComplete={handleComplete}
                  onSnooze1h={handleSnooze1h}
                  onSnoozeTomorrow={handleSnoozeTomorrow}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                />
              ))}
            </View>
          )}

          {/* Completed section */}
          {completedTasks.length > 0 && (
            <View style={{marginBottom: 16}}>
              <Text
                style={{
                  color: '#9AA0A6',
                  fontSize: 13,
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  marginBottom: 8,
                  paddingHorizontal: 4,
                }}>
                {t('tasks.sectionDoneToday')}
              </Text>
              {completedTasks.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onComplete={handleComplete}
                  onSnooze1h={handleSnooze1h}
                  onSnoozeTomorrow={handleSnoozeTomorrow}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                  isCompleted
                  onUncomplete={uncompleteTask}
                />
              ))}
            </View>
          )}

          {/* Empty state */}
          {allEmpty && (
            <View
              style={{
                alignItems: 'center',
                paddingTop: 20,
                paddingHorizontal: 32,
              }}>
              {/* Empty clock */}
              {isPro && <ClockFace tasks={[]} onTaskPress={() => {}} />}
              <Image
                source={MOODS.chill}
                style={{width: 100, height: 100, marginBottom: 16}}
                resizeMode="contain"
              />
              <Text
                style={{
                  color: '#9AA0A6',
                  fontSize: 16,
                  textAlign: 'center',
                  lineHeight: 24,
                }}>
                {t('tasks.emptyState')}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Add task input */}
        <View
          style={{
            backgroundColor: '#0B0D10',
            borderTopWidth: 1,
            borderTopColor: 'rgba(154, 160, 166, 0.1)',
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: Platform.OS === 'ios' ? 24 : 16,
          }}>
          {/* Time + duration picker row */}
          {showTimePicker && (
            <View style={{marginBottom: 8}}>
              {/* Row 1: time picker + close */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 8,
              }}>
                <Text style={{color: '#9AA0A6', fontSize: 14}}>{t('tasks.scheduleAtLabel')}</Text>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                  <DateTimePicker
                    value={selectedTime ?? new Date()}
                    mode="time"
                    display="compact"
                    onChange={handleTimeChange}
                    themeVariant="dark"
                  />
                  <TouchableOpacity
                    onPress={() => {
                      setShowTimePicker(false);
                      setSelectedTime(null);
                      setSelectedDuration(null);
                      setWantsReminder(false);
                    }}>
                    <Text style={{color: '#EF4444', fontSize: 14}}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {/* Row 2: duration slider + reminder toggle */}
              {selectedTime && (
                <View style={{marginBottom: 4}}>
                  <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2}}>
                    <Text style={{color: '#6B7280', fontSize: 12}}>{t('tasks.durationLabel')}</Text>
                    <Text style={{color: selectedDuration ? '#EDEEF0' : '#4B5563', fontSize: 13, fontWeight: '600'}}>
                      {selectedDuration
                        ? selectedDuration < 60 ? `${selectedDuration}m` : `${selectedDuration / 60}h`
                        : t('tasks.durationNone')}
                    </Text>
                  </View>
                  <Slider
                    style={{width: '100%', height: 36}}
                    minimumValue={0}
                    maximumValue={14}
                    step={1}
                    value={selectedDuration ? [null,15,30,60,120,180,240,300,360,420,480,540,600,660,720].indexOf(selectedDuration) : 0}
                    onValueChange={idx => {
                      const steps = [null,15,30,60,120,180,240,300,360,420,480,540,600,660,720];
                      setSelectedDuration(steps[idx] as number | null);
                    }}
                    minimumTrackTintColor="#6E6AF2"
                    maximumTrackTintColor="#2A2D34"
                    thumbTintColor="#6E6AF2"
                  />
                  <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                    <Text style={{color: '#4B5563', fontSize: 10}}>{t('tasks.durationNone')}</Text>
                    <Text style={{color: '#4B5563', fontSize: 10}}>{t('tasks.durationMax')}</Text>
                  </View>
                  {/* Reminder toggle */}
                  <TouchableOpacity
                    onPress={async () => {
                      if (!wantsReminder) {
                        const granted = await requestNotificationPermission();
                        if (!granted) {
                          Alert.alert(t('tasks.remindersOffAlertTitle'), t('tasks.remindersOffAlertMessage'), [{text: t('tasks.remindersOffAlertButton')}]);
                          return;
                        }
                      }
                      setWantsReminder(!wantsReminder);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 5,
                      alignSelf: 'flex-end',
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 20,
                      marginTop: 4,
                      backgroundColor: wantsReminder ? 'rgba(110,106,242,0.15)' : '#1A1D24',
                      borderWidth: 1,
                      borderColor: wantsReminder ? '#6E6AF2' : '#2A2D34',
                    }}>
                    <Text style={{fontSize: 12}}>🔔</Text>
                    <Text style={{
                      color: wantsReminder ? '#6E6AF2' : '#9AA0A6',
                      fontSize: 13,
                      fontWeight: wantsReminder ? '600' : '400',
                    }}>{t('tasks.remindButton')}</Text>
                  </TouchableOpacity>
                  {/* Recurrence picker */}
                  <View style={{marginTop: 10}}>
                    <Text style={{color: '#9AA0A6', fontSize: 11, marginBottom: 6, fontWeight: '500', letterSpacing: 0.5}}>{t('tasks.repeatLabel')}</Text>
                    <View style={{flexDirection: 'row', gap: 6}}>
                      {([null, 'daily', 'weekdays', 'weekends'] as (RecurrenceType | null)[]).map(opt => {
                        const label = opt === null ? t('tasks.repeatNone') : opt === 'daily' ? t('tasks.repeatDaily') : opt === 'weekdays' ? t('tasks.repeatWeekdays') : t('tasks.repeatWeekends');
                        const active = selectedRecurrence === opt;
                        return (
                          <TouchableOpacity
                            key={String(opt)}
                            onPress={() => setSelectedRecurrence(opt)}
                            style={{
                              flex: 1,
                              paddingVertical: 6,
                              borderRadius: 10,
                              borderWidth: 1,
                              borderColor: active ? '#6E6AF2' : '#2A2D34',
                              backgroundColor: active ? 'rgba(110,106,242,0.15)' : 'transparent',
                              alignItems: 'center',
                            }}>
                            <Text style={{color: active ? '#6E6AF2' : '#9AA0A6', fontSize: 12, fontWeight: active ? '600' : '400'}}>{label}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}

          <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
            {/* Clock block button — puts task on clock, no notification */}
            <TouchableOpacity
              onPress={() => {
                if (!isPro) {
                  navigation.navigate('Paywall', {feature: t('tasks.clockViewUpsellTitle')});
                  return;
                }
                if (showTimePicker) {
                  setShowTimePicker(false);
                  setSelectedTime(null);
                  setSelectedDuration(null);
                  setWantsReminder(false);
                } else {
                  setShowTimePicker(true);
                }
              }}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: selectedTime ? '#6E6AF2' : '#1A1D24',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
              <Text style={{fontSize: 16}}>🕐</Text>
              {!isPro && (
                <View style={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  width: 14,
                  height: 14,
                  borderRadius: 7,
                  backgroundColor: '#6E6AF2',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  <Text style={{color: '#FFF', fontSize: 8, fontWeight: '700'}}>⭐</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Text input */}
            <View
              style={{
                flex: 1,
                flexDirection: 'row',
                backgroundColor: '#141821',
                borderRadius: 12,
                paddingHorizontal: 14,
                alignItems: 'center',
              }}>
              <TextInput
                ref={inputRef}
                value={newTaskText}
                onChangeText={setNewTaskText}
                placeholder={t('tasks.addPlaceholder')}
                placeholderTextColor="#6B7280"
                returnKeyType="done"
                onSubmitEditing={handleAddTask}
                style={{
                  flex: 1,
                  color: '#EDEEF0',
                  fontSize: 16,
                  paddingVertical: 12,
                }}
              />
            </View>

            {/* Add button */}
            <TouchableOpacity
              onPress={handleAddTask}
              disabled={!newTaskText.trim()}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: newTaskText.trim() ? '#6E6AF2' : '#1A1D24',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
              <Text
                style={{
                  color: newTaskText.trim() ? '#FFFFFF' : '#6B7280',
                  fontSize: 20,
                  fontWeight: '600',
                }}>
                +
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Toast */}
        {toastMessage && (
          <Animated.View
            style={{
              position: 'absolute',
              bottom: 100,
              left: 32,
              right: 32,
              backgroundColor: '#1A1D24',
              borderRadius: 12,
              paddingVertical: 14,
              paddingHorizontal: 20,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 10,
              opacity: toastOpacity,
            }}>
            {toastMood && (
              <Image
                source={MOODS[toastMood]}
                style={{width: 28, height: 28}}
                resizeMode="contain"
              />
            )}
            <Text
              style={{
                color: '#EDEEF0',
                fontSize: 15,
                textAlign: 'center',
                lineHeight: 21,
                flexShrink: 1,
              }}>
              {toastMessage}
            </Text>
          </Animated.View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default TasksScreen;
