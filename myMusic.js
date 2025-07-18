import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Dimensions,
  ScrollView,
  Animated,
  Platform,
  TouchableOpacity,
  TouchableNativeFeedback,
  Image,
  RefreshControl,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const spacing = { xs: 8, sm: 16, md: 24, lg: 32 };
const tabs = ["Songs", "Concerts", "Playlists", "Recent"];
const Touchable = Platform.OS === "android" ? TouchableNativeFeedback : TouchableOpacity;

const SectionHeader = ({ title }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <TouchableOpacity>
      <MaterialCommunityIcons name="dots-horizontal" size={24} color="#fff" />
    </TouchableOpacity>
  </View>
);

const ItemCard = ({ image, title, subtitle }) => (
  <View style={styles.itemCard}>
    {image && <Image source={{ uri: image }} style={styles.itemImage} />}
    <View style={styles.itemTextContainer}>
      <Text style={styles.itemTitle}>{title}</Text>
      {subtitle && <Text style={styles.itemSubtitle}>{subtitle}</Text>}
    </View>
    <TouchableOpacity>
      <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
    </TouchableOpacity>
  </View>
);

const PlaylistCard = ({ title, cover }) => (
  <View style={styles.playlistCard}>
    <Image source={{ uri: cover }} style={styles.playlistCover} />
    <Text style={styles.playlistTitle}>{title}</Text>
  </View>
);

const ExploreCarousel = () => {
  const recs = ['Artist A', 'Artist B', 'Rock', 'Jazz', 'Chill', 'Focus'];
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.carouselContainer}
    >
      {recs.map((label, i) => (
        <View key={i} style={styles.carouselCard}>
          <Text style={styles.carouselText}>{label}</Text>
        </View>
      ))}
    </ScrollView>
  );
};

export default function MyMusic() {
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [refreshing, setRefreshing] = useState(false);
  const indicator = useRef(new Animated.Value(0)).current;
  const tabWidth = SCREEN_WIDTH / tabs.length;

  useEffect(() => {
    Animated.spring(indicator, {
      toValue: tabs.indexOf(activeTab) * tabWidth,
      useNativeDriver: true,
      stiffness: 220,
      damping: 20,
    }).start();
  }, [activeTab]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Songs':
        return (
          <View>
            <SectionHeader title="My Songs" />
            {[
              { id: 1, title: 'Song A', subtitle: 'Artist X' },
              { id: 2, title: 'Song B', subtitle: 'Artist Y' }
            ].map(item => (
              <ItemCard
                key={item.id}
                image="https://via.placeholder.com/50"
                title={item.title}
                subtitle={item.subtitle}
              />
            ))}
          </View>
        );
      case 'Concerts':
        return (
          <View>
            <SectionHeader title="Upcoming Concerts" />
            {[
              { id: 1, title: 'Concert A', subtitle: 'July 30, 2025' },
              { id: 2, title: 'Festival B', subtitle: 'Aug 12, 2025' }
            ].map(item => (
              <ItemCard
                key={item.id}
                image="https://via.placeholder.com/50"
                title={item.title}
                subtitle={item.subtitle}
              />
            ))}
          </View>
        );
      case 'Playlists':
        return (
          <View>
            <SectionHeader title="Your Playlists" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.playlistContainer}
            >
              {[
                { id: 1, title: 'Chill Vibes', cover: 'https://via.placeholder.com/100' },
                { id: 2, title: 'Top Hits', cover: 'https://via.placeholder.com/100' }
              ].map(pl => (
                <PlaylistCard key={pl.id} title={pl.title} cover={pl.cover} />
              ))}
            </ScrollView>
          </View>
        );
      case 'Recent':
        return (
          <View>
            <SectionHeader title="Recently Played" />
            {[
              { id: 1, title: 'Song Z', subtitle: 'Artist Q' },
              { id: 2, title: 'Concert Y', subtitle: 'Jun 20, 2025' }
            ].map(item => (
              <ItemCard
                key={item.id}
                image="https://via.placeholder.com/50"
                title={item.title}
                subtitle={item.subtitle}
              />
            ))}
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#1E90FF" />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerText}>My Music</Text>
          <View style={styles.headerIcons}>
            <Touchable style={styles.iconTouch}>
              <Ionicons name="ios-search" size={22} color="#fff" />
            </Touchable>
            <Touchable style={styles.iconTouch}>
              <Ionicons name="ios-settings" size={22} color="#fff" />
            </Touchable>
          </View>
        </View>

        <ExploreCarousel />

        <View style={styles.tabBar}>
          {tabs.map((tab, i) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
              style={styles.tabButton}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabActiveText]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
          <Animated.View
            style={[
              styles.tabIndicator,
              {
                width: tabWidth * 0.5,
                transform: [{ translateX: Animated.add(indicator, tabWidth * 0.25) }],
              },
            ]}
          />
        </View>

        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
          }
        >
          {renderContent()}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#1E90FF' },
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  headerText: { fontSize: 28, fontWeight: '800', color: '#fff' },
  headerIcons: { flexDirection: 'row' },
  iconTouch: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
  },
  carouselContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  carouselCard: {
    backgroundColor: '#ffffff30',
    borderRadius: 12,
    marginRight: spacing.sm,
    width: SCREEN_WIDTH * 0.4,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  carouselText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    marginTop: spacing.xs,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  tabText: { fontSize: 16, color: '#cce6ff' },
  tabActiveText: { color: '#fff', fontWeight: '700' },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  content: { flex: 1, marginTop: spacing.xs },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff20',
    marginHorizontal: spacing.md,
    padding: spacing.sm,
    borderRadius: 10,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  itemImage: { width: 48, height: 48, borderRadius: 8, backgroundColor: '#ccc' },
  itemTextContainer: { flex: 1, marginLeft: spacing.sm },
  itemTitle: { fontSize: 16, color: '#fff', fontWeight: '600' },
  itemSubtitle: { fontSize: 14, color: '#e0e0e0', marginTop: 2 },
  playlistContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  playlistCard: {
    backgroundColor: '#ffffff20',
    width: 120,
    marginRight: spacing.sm,
    borderRadius: 12,
    padding: spacing.sm,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  playlistCover: { width: 100, height: 100, borderRadius: 12, marginBottom: spacing.xs },
  playlistTitle: { color: '#fff', fontWeight: '700', textAlign: 'center', fontSize: 14 },
});
