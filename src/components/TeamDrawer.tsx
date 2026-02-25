/**
 * TeamDrawer — Slide-up panel for viewing the roster and hiring new developers.
 *
 * Two tabs:
 *   Roster    — lists current developers with archetype badge and velocity
 *   Job Board — 3 random candidates per sprint; hire buttons disabled mid-sprint
 *
 * Dismisses by tapping the backdrop or the close button.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  Pressable,
} from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useTeamStore } from '../stores/teamStore';
import { useSprintStore } from '../stores/sprintStore';
import { colors } from '../constants/theme';
import { formatCash } from '../utils/format.utils';
import type { Developer } from '../types';
import { TICKS_PER_DAY, DEFAULT_SPRINT_DAYS } from '../constants/game.constants';

// Inline fallback for archetype labels in case the constants file isn't ready
const ARCHETYPE_LABELS: Record<string, string> = {
  junior:      'Junior Dev',
  mid:         'Mid Dev',
  senior:      'Senior Dev',
  qa:          'QA Engineer',
  scrumMaster: 'Scrum Master',
};

interface TeamDrawerProps {
  visible: boolean;
  onClose: () => void;
}

type Tab = 'roster' | 'jobBoard';

const TeamDrawer: React.FC<TeamDrawerProps> = ({ visible, onClose }) => {
  const [activeTab, setActiveTab] = useState<Tab>('roster');
  const { developers, candidates, maxTeamSize, hireDeveloper } = useTeamStore();
  const { cashOnHand, phase, spendCash } = useSprintStore();

  const isActiveSprint = phase === 'active';
  const teamFull = developers.length >= maxTeamSize;

  const handleHire = (candidate: Developer) => {
    if (isActiveSprint || teamFull) return;
    const cost = candidate.hireCost ?? 0;
    if (cashOnHand < cost) return;
    spendCash(cost);
    hireDeveloper(candidate.id);
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      {/* Drawer panel */}
      <Animated.View
        entering={SlideInDown.springify().damping(18).stiffness(200)}
        exiting={SlideOutDown.springify().damping(18).stiffness(200)}
        style={styles.drawer}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>👥 Team</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Tab bar */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'roster' && styles.tabActive]}
            onPress={() => setActiveTab('roster')}
          >
            <Text style={[styles.tabText, activeTab === 'roster' && styles.tabTextActive]}>
              Roster ({developers.length}/{maxTeamSize})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'jobBoard' && styles.tabActive]}
            onPress={() => setActiveTab('jobBoard')}
          >
            <Text style={[styles.tabText, activeTab === 'jobBoard' && styles.tabTextActive]}>
              Job Board
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
          {activeTab === 'roster' ? (
            <>
              {developers.map((dev) => (
                <RosterCard key={dev.id} developer={dev} />
              ))}
              {teamFull && (
                <Text style={styles.noteText}>
                  Team is full. Upgrade your office to hire more.
                </Text>
              )}
            </>
          ) : (
            <>
              {isActiveSprint && (
                <Text style={[styles.noteText, { color: colors.warning }]}>
                  Hiring is available between sprints.
                </Text>
              )}
              {candidates.length === 0 ? (
                <Text style={styles.noteText}>
                  No candidates yet. Start a sprint to refresh the job board.
                </Text>
              ) : (
                candidates.map((candidate) => {
                  const cost = candidate.hireCost ?? 0;
                  const canAfford = cashOnHand >= cost;
                  const disabled = isActiveSprint || teamFull || !canAfford;
                  const disabledReason =
                    isActiveSprint ? 'Sprint in progress' :
                    teamFull ? 'Team full' :
                    !canAfford ? `Need ${formatCash(cost - cashOnHand)} more` :
                    undefined;

                  return (
                    <CandidateCard
                      key={candidate.id}
                      candidate={candidate}
                      canAfford={canAfford}
                      disabled={disabled}
                      disabledReason={disabledReason}
                      onHire={() => handleHire(candidate)}
                    />
                  );
                })
              )}
            </>
          )}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
};

// ─── Sub-components ──────────────────────────────────────────────────────────

const RosterCard: React.FC<{ developer: Developer }> = ({ developer }) => (
  <View style={styles.card}>
    <Text style={styles.cardAvatar}>{developer.avatar}</Text>
    <View style={styles.cardInfo}>
      <Text style={styles.cardName}>{developer.name}</Text>
      <View style={styles.badgeRow}>
        <View style={styles.archetypeBadge}>
          <Text style={styles.archetypeBadgeText}>
            {ARCHETYPE_LABELS[developer.archetype] ?? developer.archetype}
          </Text>
        </View>
        {developer.trait && (
          <View style={styles.traitBadge}>
            <Text style={styles.traitBadgeText}>{developer.trait.label}</Text>
          </View>
        )}
      </View>
      {developer.trait && (
        <Text style={styles.traitDesc}>{developer.trait.description}</Text>
      )}
    </View>
    <Text style={styles.velocityValue}>
      {developer.velocity.toFixed(1)}
      {'\n'}
      <Text style={styles.velocityUnit}>pts/tick</Text>
    </Text>
  </View>
);

interface CandidateCardProps {
  candidate: Developer;
  canAfford: boolean;
  disabled: boolean;
  disabledReason?: string;
  onHire: () => void;
}

const CandidateCard: React.FC<CandidateCardProps> = ({
  candidate,
  canAfford,
  disabled,
  disabledReason,
  onHire,
}) => {
  const activeDays = DEFAULT_SPRINT_DAYS - 1;
  const ptsPerSprint = Math.round(candidate.velocity * TICKS_PER_DAY * activeDays);

  return (
    <View style={styles.card}>
      <Text style={styles.cardAvatar}>{candidate.avatar}</Text>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{candidate.name}</Text>
        <View style={styles.badgeRow}>
          <View style={styles.archetypeBadge}>
            <Text style={styles.archetypeBadgeText}>
              {ARCHETYPE_LABELS[candidate.archetype] ?? candidate.archetype}
            </Text>
          </View>
          {candidate.trait && (
            <View style={styles.traitBadge}>
              <Text style={styles.traitBadgeText}>{candidate.trait.label}</Text>
            </View>
          )}
        </View>
        <Text style={styles.capacityStat}>+{ptsPerSprint} pts/sprint</Text>
        {candidate.trait && (
          <Text style={styles.traitDesc}>{candidate.trait.description}</Text>
        )}
        {disabledReason && (
          <Text style={styles.disabledReason}>{disabledReason}</Text>
        )}
      </View>
      <View style={styles.cardRight}>
        <Text style={[styles.hireCost, !canAfford && styles.hireCostCantAfford]}>
          {formatCash(candidate.hireCost ?? 0)}
        </Text>
        <TouchableOpacity
          style={[styles.hireBtn, disabled && styles.hireBtnDisabled]}
          onPress={onHire}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <Text style={[styles.hireBtnText, disabled && styles.hireBtnTextDisabled]}>
            Hire
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlayBg,
  },
  drawer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
    paddingBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.accent,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '900',
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    color: colors.textSecondary,
    fontSize: 18,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: colors.bgSecondary,
  },
  tabActive: {
    backgroundColor: colors.accent,
  },
  tabText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  tabTextActive: {
    color: colors.textPrimary,
  },
  content: {
    flex: 1,
    marginTop: 12,
  },
  contentInner: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSecondary,
    borderRadius: 10,
    padding: 12,
    gap: 12,
  },
  cardAvatar: {
    fontSize: 28,
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  archetypeBadge: {
    backgroundColor: colors.accent,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  archetypeBadgeText: {
    color: colors.textPrimary,
    fontSize: 10,
    fontWeight: '700',
  },
  traitBadge: {
    backgroundColor: colors.bgPrimary,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  traitBadgeText: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: '700',
  },
  traitDesc: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 4,
    fontStyle: 'italic',
  },
  disabledReason: {
    color: colors.danger,
    fontSize: 10,
    marginTop: 4,
  },
  velocityValue: {
    color: colors.success,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  velocityUnit: {
    color: colors.textSecondary,
    fontSize: 9,
    fontWeight: '400',
  },
  cardRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  hireCost: {
    color: colors.success,
    fontSize: 14,
    fontWeight: '700',
  },
  hireCostCantAfford: {
    color: colors.danger,
  },
  hireBtn: {
    backgroundColor: colors.success,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  hireBtnDisabled: {
    backgroundColor: colors.bgTrack,
  },
  hireBtnText: {
    color: colors.textDark,
    fontSize: 12,
    fontWeight: '900',
  },
  hireBtnTextDisabled: {
    color: colors.textSecondary,
  },
  noteText: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 16,
    fontStyle: 'italic',
  },
  capacityStat: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
});

export default TeamDrawer;
