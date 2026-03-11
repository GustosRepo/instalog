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
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Svg, {Circle, Path, Line, Text as SvgText} from 'react-native-svg';
import DateTimePicker from '@react-native-community/datetimepicker';
import {useNavigation} from '@react-navigation/native';
import {useTaskStore} from '../stores/useTaskStore';
import {useSubscriptionStore} from '../stores/useSubscriptionStore';
import {Task, formatTime} from '../models/types';
import {Haptics} from '../utils/haptics';
import {requestNotificationPermission} from '../utils/notifications';
import {MOODS} from '../utils/moods';

// Calm copy
const EMPTY_STATE = "Nothing here yet. Add something when you're ready.";
const SNOOZE_1H = "No worries. I'll remind you in a bit.";
const SNOOZE_TOMORROW = "All good. Let's pick this up tomorrow.";
const TASK_DONE = 'Nice. One thing off your mind.';

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

const CLOCK_SIZE = Dimensions.get('window').width - 80;
const CENTER = CLOCK_SIZE / 2;
const CLOCK_RADIUS = CLOCK_SIZE / 2 - 20;
const ARC_RADIUS = CLOCK_RADIUS - 18;
const HOUR_MARK_OUTER = CLOCK_RADIUS - 4;
const HOUR_MARK_INNER = CLOCK_RADIUS - 14;
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

  return (
    <View style={{alignItems: 'center', marginBottom: 16}}>
      <Svg width={CLOCK_SIZE} height={CLOCK_SIZE}>
        {/* Clock background */}
        <Circle
          cx={CENTER}
          cy={CENTER}
          r={CLOCK_RADIUS}
          fill="#141821"
          stroke="#2A2D34"
          strokeWidth={2}
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
                strokeWidth={i % 3 === 0 ? 2.5 : 1.5}
              />
              <SvgText
                x={labelX}
                y={labelY + 4}
                fill="#6B7280"
                fontSize={12}
                fontWeight={i % 3 === 0 ? '600' : '400'}
                textAnchor="middle">
                {hour}
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* Task arcs */}
        {timedTasks.map((task, index) => {
          const taskHour = getClockHour(task.dueTime!);
          // Each arc spans ~45 min (0.75 hours) centered on the due time
          const spanHours = 0.75;
          const startHour = taskHour - spanHours / 2;
          const endHour = taskHour + spanHours / 2;
          const startAngle = hourToAngle(startHour);
          const endAngle = hourToAngle(endHour);
          const color = ARC_COLORS[index % ARC_COLORS.length];

          // Offset each arc ring slightly outward for stacking
          const arcR = ARC_RADIUS - index * 8;
          if (arcR < 30) return null; // Don't draw if too many tasks overlap

          const arcPath = describeArc(CENTER, CENTER, arcR, startAngle, endAngle);

          return (
            <Path
              key={task.id}
              d={arcPath}
              stroke={color}
              strokeWidth={6}
              strokeLinecap="round"
              fill="none"
              opacity={0.85}
            />
          );
        })}

        {/* Center dot */}
        <Circle cx={CENTER} cy={CENTER} r={5} fill="#6E6AF2" />

        {/* Current time hand */}
        <Line
          x1={CENTER}
          y1={CENTER}
          x2={handEndX}
          y2={handEndY}
          stroke="#6E6AF2"
          strokeWidth={2.5}
          strokeLinecap="round"
        />

        {/* AM/PM indicator */}
        <SvgText
          x={CENTER}
          y={CENTER + 30}
          fill="#6B7280"
          fontSize={11}
          fontWeight="500"
          textAnchor="middle">
          {isAM ? 'AM' : 'PM'}
        </SvgText>
      </Svg>

      {/* Legend: task labels next to their color */}
      {timedTasks.length > 0 && (
        <View style={{marginTop: 8, paddingHorizontal: 16, width: '100%'}}>
          {timedTasks.map((task, index) => {
            const color = ARC_COLORS[index % ARC_COLORS.length];
            return (
              <TouchableOpacity
                key={task.id}
                onPress={() => onTaskPress(task)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 6,
                }}>
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: color,
                    marginRight: 10,
                  }}
                />
                <Text
                  style={{color: '#EDEEF0', fontSize: 14, flex: 1}}
                  numberOfLines={1}>
                  {task.text}
                </Text>
                <Text style={{color: '#9AA0A6', fontSize: 12}}>
                  {formatTime(task.dueTime!)}
                </Text>
              </TouchableOpacity>
            );
          })}
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
  isCompleted,
  onUncomplete,
  color,
}) => {
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
                ⏰ {formatTime(task.dueTime)}
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
              <Text
                style={{color: '#9AA0A6', fontSize: 13, fontWeight: '500'}}>
                Later
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
              <Text
                style={{color: '#9AA0A6', fontSize: 13, fontWeight: '500'}}>
                Tomorrow
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
              <Text
                style={{color: '#EF4444', fontSize: 13, fontWeight: '500'}}>
                Remove
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const TasksScreen: React.FC = () => {
  const [newTaskText, setNewTaskText] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState<Date | null>(null);
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
    await addTask(trimmed, dueTime);

    Haptics.light();
    setNewTaskText('');
    setSelectedTime(null);
    setShowTimePicker(false);
    Keyboard.dismiss();
  };

  const handleComplete = (id: string) => {
    completeTask(id);
    showToast(TASK_DONE, 'cheerful');
  };

  const handleSnooze1h = (id: string) => {
    const snoozeTo = new Date(Date.now() + 60 * 60 * 1000);
    snoozeTask(id, snoozeTo.toISOString());
    Haptics.light();
    showToast(SNOOZE_1H, 'upset');
  };

  const handleSnoozeTomorrow = (id: string) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    snoozeTask(id, tomorrow.toISOString());
    Haptics.light();
    showToast(SNOOZE_TOMORROW, 'upset');
  };

  const handleDelete = (id: string) => {
    Alert.alert('Remove task?', "It'll be gone for good.", [
      {text: 'Keep it', style: 'cancel'},
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          removeTask(id);
          Haptics.light();
        },
      },
    ]);
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
              Tasks
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Settings')} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
              <Text style={{fontSize: 20, opacity: 0.7}}>⚙️</Text>
            </TouchableOpacity>
          </View>
          <Text style={{color: '#9AA0A6', fontSize: 14, marginTop: 2}}>
            Your day, your pace.
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{paddingHorizontal: 16, paddingBottom: 120}}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Clock — Pro only */}
          {!allEmpty && isPro && <ClockFace tasks={todayTasks} onTaskPress={handleClockTaskPress} />}

          {/* Clock upsell for free users */}
          {!allEmpty && !isPro && timedTasks.length > 0 && (
            <TouchableOpacity
              onPress={() => navigation.navigate('Paywall')}
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
                Clock View
              </Text>
              <Text style={{color: '#9AA0A6', fontSize: 13, textAlign: 'center'}}>
                See your scheduled tasks on a visual clock. Upgrade to Pro.
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
                Today
              </Text>
              {untimedTasks.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onComplete={handleComplete}
                  onSnooze1h={handleSnooze1h}
                  onSnoozeTomorrow={handleSnoozeTomorrow}
                  onDelete={handleDelete}
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
                Scheduled
              </Text>
              {timedTasks.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onComplete={handleComplete}
                  onSnooze1h={handleSnooze1h}
                  onSnoozeTomorrow={handleSnoozeTomorrow}
                  onDelete={handleDelete}
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
                Later
              </Text>
              {laterTasks.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onComplete={handleComplete}
                  onSnooze1h={handleSnooze1h}
                  onSnoozeTomorrow={handleSnoozeTomorrow}
                  onDelete={handleDelete}
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
                Done today
              </Text>
              {completedTasks.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onComplete={handleComplete}
                  onSnooze1h={handleSnooze1h}
                  onSnoozeTomorrow={handleSnoozeTomorrow}
                  onDelete={handleDelete}
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
                {EMPTY_STATE}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Add task input */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: '#0B0D10',
            borderTopWidth: 1,
            borderTopColor: 'rgba(154, 160, 166, 0.1)',
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: Platform.OS === 'ios' ? 24 : 16,
          }}>
          {/* Time picker row */}
          {showTimePicker && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 8,
                justifyContent: 'space-between',
              }}>
              <Text style={{color: '#9AA0A6', fontSize: 14}}>
                Remind me at:
              </Text>
              <View
                style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
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
                  }}>
                  <Text style={{color: '#EF4444', fontSize: 14}}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
            {/* Reminder toggle — Pro only */}
            <TouchableOpacity
              onPress={async () => {
                if (!isPro) {
                  navigation.navigate('Paywall');
                  return;
                }
                if (!showTimePicker) {
                  const granted = await requestNotificationPermission();
                  if (!granted) {
                    Alert.alert(
                      'Reminders are off',
                      'You can enable them anytime in Settings.',
                      [{text: 'Got it'}],
                    );
                  }
                }
                setShowTimePicker(!showTimePicker);
                if (showTimePicker) setSelectedTime(null);
              }}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: selectedTime ? '#6E6AF2' : '#1A1D24',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
              <Text style={{fontSize: 16}}>⏰</Text>
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
                placeholder="Add a task..."
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
