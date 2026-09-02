import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { MemberInvitationResult } from '../types';
import { QrCode, X, CheckCircle, Shield } from 'lucide-react-native';

interface InviteModalProps {
  visible: boolean;
  invite: MemberInvitationResult | null;
  onClose: () => void;
}

export const InviteModal: React.FC<InviteModalProps> = ({ visible, invite, onClose }) => {
  if (!invite) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <QrCode size={24} color="#EAB308" style={{ marginRight: 8 }} />
              <Text style={styles.title}>Member Activation</Text>
            </View>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <X size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <Text style={styles.description}>
            Share this activation code with the member. When they open the GymDeck Member App,
            they will enter this code to securely link their membership.
          </Text>

          <View style={styles.codeBox}>
            <Text style={styles.codeLabel}>ACTIVATION CODE</Text>
            <Text style={styles.displayCode}>{invite.displayCode}</Text>
            <Text style={styles.expiryText}>
              Expires on {new Date(invite.expiresAt).toLocaleDateString()}
            </Text>
          </View>

          <View style={styles.securityNote}>
            <Shield size={14} color="#10B981" style={{ marginRight: 6 }} />
            <Text style={styles.securityText}>Single-use • Cryptographically verified</Text>
          </View>

          <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.8}>
            <CheckCircle size={18} color="#0A0D14" style={{ marginRight: 6 }} />
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#131823',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  description: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
    marginBottom: 20,
  },
  codeBox: {
    backgroundColor: '#0A0D14',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EAB308',
    padding: 18,
    alignItems: 'center',
    marginBottom: 16,
  },
  codeLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#94A3B8',
    marginBottom: 4,
  },
  displayCode: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 4,
    color: '#EAB308',
  },
  expiryText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 6,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  securityText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAB308',
    borderRadius: 12,
    height: 48,
  },
  doneBtnText: {
    color: '#0A0D14',
    fontSize: 15,
    fontWeight: '700',
  },
});
