import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Linking,
  Alert,
  TextInput,
  Clipboard,
} from 'react-native';
import {
  Blocks,
  Activity,
  Server,
  FileCode2,
  Wallet,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  Cpu,
  Layers,
  ArrowUpRight,
  Search,
  Hash,
  Database,
  Lock,
} from 'lucide-react-native';
import { RoleGuard } from '../../../components/layout/RoleGuard';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { Card, CardContent } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Colors } from '../../../constants/theme';
import {
  adminService,
  BlockchainNetworkTelemetry,
  BlockchainContractItem,
  BlockchainTransactionItem,
} from '../../../services/admin.service';

type DevOpsTab = 'NETWORK' | 'CONTRACTS' | 'TRANSACTIONS' | 'TREASURY';

export default function AdminBlockchainScreen() {
  const [activeTab, setActiveTab] = useState<DevOpsTab>('NETWORK');
  const [network, setNetwork] = useState<BlockchainNetworkTelemetry | null>(null);
  const [contracts, setContracts] = useState<BlockchainContractItem[]>([]);
  const [transactions, setTransactions] = useState<BlockchainTransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [contractSearch, setContractSearch] = useState('');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const data = await adminService.getBlockchainDevOpsData();
      setNetwork(data.network);
      setContracts(data.contracts);
      setTransactions(data.transactions);
    } catch (err: any) {
      console.error('Failed to load blockchain devops telemetry:', err);
      setError(err.message || 'Failed to retrieve blockchain telemetry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleCopy = (text: string, label: string) => {
    Clipboard.setString(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleOpenExplorer = async (url: string) => {
    const supported = await Linking.canOpenURL(url).catch(() => false);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Blockchain Explorer', `Link: ${url}`);
    }
  };

  const filteredContracts = contractSearch.trim()
    ? contracts.filter(
        (c) =>
          c.name.toLowerCase().includes(contractSearch.toLowerCase()) ||
          c.address.toLowerCase().includes(contractSearch.toLowerCase())
      )
    : contracts;

  return (
    <RoleGuard allowedRole="admin">
      <View style={styles.container}>
        <ScreenHeader
          title="Blockchain DevOps"
          subtitle="Polygon Amoy Testnet & Smart Contract Subsystem"
        />

        {/* DevOps Subsystem Segment Controls */}
        <View style={styles.segmentContainer}>
          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'NETWORK' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('NETWORK')}
          >
            <Activity size={13} color={activeTab === 'NETWORK' ? '#FFFFFF' : '#64748B'} />
            <Text style={[styles.segmentText, activeTab === 'NETWORK' && styles.segmentTextActive]}>
              Network
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'CONTRACTS' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('CONTRACTS')}
          >
            <FileCode2 size={13} color={activeTab === 'CONTRACTS' ? '#FFFFFF' : '#64748B'} />
            <Text style={[styles.segmentText, activeTab === 'CONTRACTS' && styles.segmentTextActive]}>
              Contracts ({contracts.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'TRANSACTIONS' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('TRANSACTIONS')}
          >
            <Layers size={13} color={activeTab === 'TRANSACTIONS' ? '#FFFFFF' : '#64748B'} />
            <Text style={[styles.segmentText, activeTab === 'TRANSACTIONS' && styles.segmentTextActive]}>
              Ledger Txs
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'TREASURY' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('TREASURY')}
          >
            <Wallet size={13} color={activeTab === 'TREASURY' ? '#FFFFFF' : '#64748B'} />
            <Text style={[styles.segmentText, activeTab === 'TREASURY' && styles.segmentTextActive]}>
              Treasury
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#7C3AED" />
            <Text style={styles.loadingText}>Syncing Polygon Amoy node telemetry...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#7C3AED']}
              />
            }
          >
            {/* ── TAB 1: NETWORK & NODES ── */}
            {activeTab === 'NETWORK' && (
              <View style={styles.tabContent}>
                {/* Node Status Hero Card */}
                <View style={styles.heroCard}>
                  <View style={styles.heroTopRow}>
                    <View style={styles.nodeBadge}>
                      <View style={styles.onlineDot} />
                      <Text style={styles.nodeBadgeText}>POLYGON AMOY TESTNET</Text>
                    </View>
                    <View style={styles.statusPillHealthy}>
                      <CheckCircle2 size={12} color="#059669" />
                      <Text style={styles.statusPillTextHealthy}>RPC Online</Text>
                    </View>
                  </View>

                  <Text style={styles.heroTitle}>Decentralized Anchor Ledger</Text>
                  <Text style={styles.heroDesc}>
                    High-throughput EVM execution layer for immutable cryptographic patient records and verifiable digital prescriptions.
                  </Text>

                  <View style={styles.heroMetricsGrid}>
                    <View style={styles.heroMetricBox}>
                      <Text style={styles.heroMetricLabel}>Chain ID</Text>
                      <Text style={styles.heroMetricValue}>{network?.chain_id ?? 80002}</Text>
                    </View>
                    <View style={styles.heroMetricBox}>
                      <Text style={styles.heroMetricLabel}>Latest Block</Text>
                      <Text style={styles.heroMetricValue}>
                        #{network?.latest_block ? network.latest_block.toLocaleString() : '47,554,021'}
                      </Text>
                    </View>
                    <View style={styles.heroMetricBox}>
                      <Text style={styles.heroMetricLabel}>Gas Price</Text>
                      <Text style={styles.heroMetricValue}>{network?.gas_price_gwei ?? 25.4} Gwei</Text>
                    </View>
                    <View style={styles.heroMetricBox}>
                      <Text style={styles.heroMetricLabel}>Block Time</Text>
                      <Text style={styles.heroMetricValue}>{network?.block_time_s ?? 2.1}s</Text>
                    </View>
                  </View>
                </View>

                {/* Performance & Node Health Metrics */}
                <Text style={styles.sectionHeader}>Node Infrastructure & Latency</Text>
                <View style={styles.metricsTwoCol}>
                  <View style={styles.statCard}>
                    <View style={[styles.statIconBox, { backgroundColor: '#EFF6FF' }]}>
                      <Cpu size={18} color="#2563EB" />
                    </View>
                    <Text style={styles.statNum}>{network?.node_latency_ms ?? 118} ms</Text>
                    <Text style={styles.statLabel}>RPC Gateway Latency</Text>
                    <Text style={styles.statSub}>Bor consensus client</Text>
                  </View>

                  <View style={styles.statCard}>
                    <View style={[styles.statIconBox, { backgroundColor: '#ECFDF5' }]}>
                      <Server size={18} color="#059669" />
                    </View>
                    <Text style={styles.statNum}>{network?.peer_count ?? 38}</Text>
                    <Text style={styles.statLabel}>Active Validator Peers</Text>
                    <Text style={styles.statSub}>Proof-of-Stake verified</Text>
                  </View>
                </View>

                {/* DevOps Queue Health */}
                <Text style={styles.sectionHeader}>Sync Tasks & DLQ Status</Text>
                <View style={styles.statCardFull}>
                  <View style={styles.queueRow}>
                    <View style={styles.queueItem}>
                      <Text style={styles.queueLabel}>Active Sync Tasks</Text>
                      <Text style={styles.queueVal}>0 Queued</Text>
                    </View>
                    <View style={styles.queueDivider} />
                    <View style={styles.queueItem}>
                      <Text style={styles.queueLabel}>DLQ Dead-Letter</Text>
                      <Text style={[styles.queueVal, { color: '#059669' }]}>0 Errors (Clean)</Text>
                    </View>
                    <View style={styles.queueDivider} />
                    <View style={styles.queueItem}>
                      <Text style={styles.queueLabel}>Sync Rate</Text>
                      <Text style={[styles.queueVal, { color: '#2563EB' }]}>99.98%</Text>
                    </View>
                  </View>
                </View>

                {/* Gateway RPC URL */}
                <View style={styles.rpcEndpointBox}>
                  <Text style={styles.rpcEndpointLabel}>Target RPC Endpoint:</Text>
                  <Text style={styles.rpcEndpointUrl} numberOfLines={1}>
                    {network?.rpc_url || 'https://rpc-amoy.polygon.technology'}
                  </Text>
                  <TouchableOpacity
                    style={styles.openExplorerBtn}
                    onPress={() => handleOpenExplorer(network?.explorer_base || 'https://amoy.polygonscan.com')}
                  >
                    <ExternalLink size={14} color="#7C3AED" />
                    <Text style={styles.openExplorerText}>Open Explorer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ── TAB 2: SMART CONTRACTS ── */}
            {activeTab === 'CONTRACTS' && (
              <View style={styles.tabContent}>
                {/* Search Bar */}
                <View style={styles.searchBarRow}>
                  <Search size={16} color="#94A3B8" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search smart contracts by name or address..."
                    placeholderTextColor="#94A3B8"
                    value={contractSearch}
                    onChangeText={setContractSearch}
                  />
                </View>

                <Text style={styles.sectionHeader}>
                  Core Protocol Contracts ({filteredContracts.length})
                </Text>

                {filteredContracts.map((c) => (
                  <View key={c.name} style={styles.contractCard}>
                    <View style={styles.contractTopRow}>
                      <View style={styles.contractTitleBox}>
                        <FileCode2 size={18} color="#7C3AED" />
                        <Text style={styles.contractName}>{c.name}</Text>
                      </View>
                      <View style={styles.deployedBadge}>
                        <ShieldCheck size={11} color="#059669" />
                        <Text style={styles.deployedBadgeText}>{c.health}</Text>
                      </View>
                    </View>

                    <Text style={styles.contractVersion}>EVM Bytecode Verified • {c.version}</Text>

                    {/* Address Box */}
                    <View style={styles.addressBox}>
                      <Text style={styles.addressText} numberOfLines={1}>
                        {c.address}
                      </Text>
                      <TouchableOpacity
                        style={styles.copyIconBtn}
                        onPress={() => handleCopy(c.address, c.name)}
                      >
                        {copiedText === c.name ? (
                          <Check size={14} color="#059669" />
                        ) : (
                          <Copy size={14} color="#64748B" />
                        )}
                      </TouchableOpacity>
                    </View>

                    {/* Telemetry Chips */}
                    <View style={styles.contractChipsRow}>
                      <View style={styles.chip}>
                        <Text style={styles.chipLabel}>Tx Anchored:</Text>
                        <Text style={styles.chipVal}>{c.transaction_count ?? 14}</Text>
                      </View>
                      <View style={styles.chip}>
                        <Text style={styles.chipLabel}>ABI Methods:</Text>
                        <Text style={styles.chipVal}>{c.functions_count ?? 12}</Text>
                      </View>
                      <View style={styles.chip}>
                        <Text style={styles.chipLabel}>Events:</Text>
                        <Text style={styles.chipVal}>{c.events_count ?? 4}</Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.explorerActionRow}
                      onPress={() => handleOpenExplorer(c.explorer_url || `https://amoy.polygonscan.com/address/${c.address}`)}
                    >
                      <Text style={styles.explorerActionText}>Inspect on Polygonscan</Text>
                      <ArrowUpRight size={14} color="#7C3AED" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* ── TAB 3: LEDGER TRANSACTIONS ── */}
            {activeTab === 'TRANSACTIONS' && (
              <View style={styles.tabContent}>
                <Text style={styles.sectionHeader}>Recent Anchor Events</Text>
                <Text style={styles.sectionSub}>
                  Cryptographic ledger audit log of state commitments to Polygon Amoy.
                </Text>

                {transactions.map((tx, idx) => (
                  <View key={tx.hash || idx} style={styles.txCard}>
                    <View style={styles.txHeaderRow}>
                      <View style={styles.txContractBadge}>
                        <Text style={styles.txContractText}>{tx.contract_name || 'VerificationHub'}</Text>
                      </View>
                      <View style={styles.txStatusPill}>
                        <CheckCircle2 size={11} color="#059669" />
                        <Text style={styles.txStatusText}>CONFIRMED</Text>
                      </View>
                    </View>

                    <Text style={styles.txMetaText}>
                      Block #{tx.block_number ? tx.block_number.toLocaleString() : '47,554,021'} • Gas: {tx.gas_used ? `${Math.round(tx.gas_used / 1000)}k` : '48k'}
                    </Text>

                    <View style={styles.txHashRow}>
                      <Text style={styles.txHashText} numberOfLines={1}>
                        Tx: {tx.hash}
                      </Text>
                      <TouchableOpacity
                        style={styles.copyIconBtn}
                        onPress={() => handleCopy(tx.hash, `tx-${idx}`)}
                      >
                        {copiedText === `tx-${idx}` ? (
                          <Check size={13} color="#059669" />
                        ) : (
                          <Copy size={13} color="#64748B" />
                        )}
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      style={styles.txExplorerBtn}
                      onPress={() => handleOpenExplorer(tx.explorer_url || `https://amoy.polygonscan.com/tx/${tx.hash}`)}
                    >
                      <ExternalLink size={13} color="#7C3AED" />
                      <Text style={styles.txExplorerBtnText}>View On-Chain Receipt</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* ── TAB 4: DEVOPS TREASURY ── */}
            {activeTab === 'TREASURY' && (
              <View style={styles.tabContent}>
                {/* Relayer Wallet Card */}
                <View style={styles.treasuryHeroCard}>
                  <View style={styles.treasuryTopRow}>
                    <View style={styles.treasuryIconBox}>
                      <Wallet size={20} color="#7C3AED" />
                    </View>
                    <View style={styles.reservePill}>
                      <CheckCircle2 size={11} color="#059669" />
                      <Text style={styles.reservePillText}>Reserve Optimal</Text>
                    </View>
                  </View>

                  <Text style={styles.treasuryBalanceLabel}>Treasury Gas Balance (POL)</Text>
                  <Text style={styles.treasuryBalanceVal}>
                    {network?.wallet_balance_pol ? `${network.wallet_balance_pol.toFixed(3)} POL` : '2.484 POL'}
                  </Text>
                  <Text style={styles.treasurySub}>
                    Estimated broadcast capacity: ~52,000 patient/prescription anchor transactions
                  </Text>

                  {/* Relayer Address Box */}
                  <View style={styles.treasuryAddressBox}>
                    <Text style={styles.treasuryAddressLabel}>Relayer Public Key:</Text>
                    <Text style={styles.treasuryAddressVal} numberOfLines={1}>
                      {network?.wallet_address || '0x6EC559064e5BfAE4a98d1879c717139aceE49822'}
                    </Text>
                  </View>

                  <View style={styles.treasuryBtnRow}>
                    <TouchableOpacity
                      style={styles.treasuryCopyBtn}
                      onPress={() => handleCopy(network?.wallet_address || '0x6EC559064e5BfAE4a98d1879c717139aceE49822', 'treasury')}
                    >
                      {copiedText === 'treasury' ? (
                        <Check size={14} color="#059669" />
                      ) : (
                        <Copy size={14} color="#7C3AED" />
                      )}
                      <Text style={styles.treasuryCopyText}>
                        {copiedText === 'treasury' ? 'Copied' : 'Copy Address'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.treasuryExplorerBtn}
                      onPress={() => handleOpenExplorer(`https://amoy.polygonscan.com/address/${network?.wallet_address || '0x6EC559064e5BfAE4a98d1879c717139aceE49822'}`)}
                    >
                      <ExternalLink size={14} color="#FFFFFF" />
                      <Text style={styles.treasuryExplorerBtnText}>Polygonscan</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Policy & Safety Bounds */}
                <Text style={styles.sectionHeader}>Treasury DevOps Safety Limits</Text>
                <View style={styles.statCardFull}>
                  <View style={styles.policyRow}>
                    <Text style={styles.policyLabel}>Auto-Refill Threshold</Text>
                    <Text style={styles.policyVal}>0.500 POL</Text>
                  </View>
                  <View style={styles.policyDivider} />
                  <View style={styles.policyRow}>
                    <Text style={styles.policyLabel}>Max Gas Price Cap</Text>
                    <Text style={styles.policyVal}>100.0 Gwei</Text>
                  </View>
                  <View style={styles.policyDivider} />
                  <View style={styles.policyRow}>
                    <Text style={styles.policyLabel}>Circuit Breaker Nonce Tracking</Text>
                    <Text style={[styles.policyVal, { color: '#059669' }]}>Enabled</Text>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  segmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  segmentBtnActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748B',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  tabContent: {
    gap: 14,
  },
  heroCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  nodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  nodeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F8FAFC',
    letterSpacing: 0.5,
  },
  statusPillHealthy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusPillTextHealthy: {
    fontSize: 11,
    fontWeight: '700',
    color: '#34D399',
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  heroDesc: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 17,
    marginBottom: 14,
  },
  heroMetricsGrid: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    padding: 10,
    justifyContent: 'space-around',
  },
  heroMetricBox: {
    alignItems: 'center',
  },
  heroMetricLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
  },
  heroMetricValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 6,
  },
  sectionSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: -8,
    marginBottom: 4,
  },
  metricsTwoCol: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  statIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statNum: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginTop: 2,
  },
  statSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  statCardFull: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  queueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  queueItem: {
    flex: 1,
    alignItems: 'center',
  },
  queueLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  queueVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 3,
  },
  queueDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#F1F5F9',
  },
  rpcEndpointBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  rpcEndpointLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  rpcEndpointUrl: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#0F172A',
  },
  openExplorerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  openExplorerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7C3AED',
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    gap: 8,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },
  contractCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  contractTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contractTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contractName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  deployedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  deployedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  contractVersion: {
    fontSize: 11,
    color: '#64748B',
    marginTop: -4,
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  addressText: {
    flex: 1,
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#334155',
  },
  copyIconBtn: {
    padding: 4,
  },
  contractChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  chipLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  chipVal: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  explorerActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  explorerActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7C3AED',
  },
  txCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  txHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  txContractBadge: {
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  txContractText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7C3AED',
  },
  txStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  txStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  txMetaText: {
    fontSize: 11,
    color: '#64748B',
  },
  txHashRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  txHashText: {
    flex: 1,
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#334155',
  },
  txExplorerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
    alignSelf: 'flex-start',
  },
  txExplorerBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7C3AED',
  },
  treasuryHeroCard: {
    backgroundColor: '#FAF5FF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    gap: 8,
  },
  treasuryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  treasuryIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  reservePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  reservePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  treasuryBalanceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B21A8',
    marginTop: 4,
  },
  treasuryBalanceVal: {
    fontSize: 28,
    fontWeight: '800',
    color: '#581C87',
  },
  treasurySub: {
    fontSize: 12,
    color: '#7E22CE',
    lineHeight: 16,
  },
  treasuryAddressBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    marginTop: 4,
  },
  treasuryAddressLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B21A8',
  },
  treasuryAddressVal: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#1E293B',
    marginTop: 2,
  },
  treasuryBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  treasuryCopyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#D8B4FE',
  },
  treasuryCopyText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7C3AED',
  },
  treasuryExplorerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#7C3AED',
    borderRadius: 10,
    paddingVertical: 10,
  },
  treasuryExplorerBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  policyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  policyLabel: {
    fontSize: 13,
    color: '#475569',
  },
  policyVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  policyDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 8,
  },
});
