import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { ActionButton } from '@components/ui/ActionButton.jsx';
import { FilterBar } from '@components/ui/FilterBar.jsx';
import { FilterTabs } from '@components/ui/FilterTabs.jsx';
import { MetaBox } from '@components/ui/MetaBox.jsx';
import { SectionTopBar } from '@components/ui/SectionTopBar.jsx';
import { ThemedTextInput } from '@components/ui/ThemedTextInput.jsx';
import { layoutStyles } from '@components/styles.js';
import { useDirtyFormState } from '@hooks/useDirtyFormState.js';

function createSettingsSections({ palette, settingsForm }) {
  const values = settingsForm.values;
  const dirty = settingsForm.dirtyMap;
  const labelColor = (field) => (dirty[field] ? palette.accent : palette.text);
  const dirtyMark = (field) => (dirty[field] ? ' *' : '');

  return [
    {
      id: 'general',
      label: 'General',
      keywords: ['site title', 'tagline', 'branding'],
      render: () => (
        <MetaBox title="General Settings" palette={palette}>
          <View style={{ gap: 12 }}>
            <Text style={{ color: labelColor('siteTitle') }}>{`Site Title${dirtyMark('siteTitle')}`}</Text>
            <ThemedTextInput
              palette={palette}
              value={values.siteTitle}
              onChangeText={(next) => settingsForm.setField('siteTitle', next)}
              placeholder="My Awesome Site"
            />
            <Text style={{ color: labelColor('tagline') }}>{`Tagline${dirtyMark('tagline')}`}</Text>
            <ThemedTextInput
              palette={palette}
              value={values.tagline}
              onChangeText={(next) => settingsForm.setField('tagline', next)}
              placeholder="Just another Geekist site"
            />
          </View>
        </MetaBox>
      )
    },
    {
      id: 'permalinks',
      label: 'Permalinks',
      keywords: ['url', 'slug', 'permalink', 'routing'],
      render: () => (
        <MetaBox title="Permalink Structure" palette={palette}>
          <Text style={{ color: palette.textMuted, fontSize: 13, marginBottom: 12 }}>
            Choose how your post URLs should look.
          </Text>
          <FilterBar compact>
            <FilterTabs
              palette={palette}
              currentFilter={values.permalinkStructure || 'name'}
              onFilterChange={(next) => settingsForm.setField('permalinkStructure', next)}
              collapseOnMobile
              mobileLabel="Permalink"
              filters={[
                { label: 'Plain', value: 'plain' },
                { label: 'Day and name', value: 'day' },
                { label: 'Post name', value: 'name' }
              ]}
            />
          </FilterBar>
        </MetaBox>
      )
    }
  ];
}

export function SettingsScene({ palette, settings, actions }) {
  const [query, setQuery] = useState('');
  const [activeSection, setActiveSection] = useState('all');
  const settingsForm = useDirtyFormState({
    siteTitle: settings?.siteTitle || '',
    tagline: settings?.tagline || '',
    permalinkStructure: settings?.permalinkStructure || 'name'
  });

  function saveSettings() {
    if (!settingsForm.isDirty) return;
    actions.onUpdateSettings({
      siteTitle: settingsForm.values.siteTitle,
      tagline: settingsForm.values.tagline,
      permalinkStructure: settingsForm.values.permalinkStructure
    });
    settingsForm.markSaved(settingsForm.values);
  }

  const sections = useMemo(
    () => createSettingsSections({ palette, settingsForm }),
    [palette, settingsForm]
  );
  const sectionTabs = useMemo(
    () => [{ label: 'All', value: 'all' }, ...sections.map((section) => ({ label: section.label, value: section.id }))],
    [sections]
  );
  const normalizedQuery = String(query || '').trim().toLowerCase();
  const visibleSections = useMemo(() => {
    return sections.filter((section) => {
      if (activeSection !== 'all' && section.id !== activeSection) return false;
      if (!normalizedQuery) return true;
      const haystack = [section.label, ...(section.keywords || [])].join(' ').toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [sections, activeSection, normalizedQuery]);

  return (
    <View style={layoutStyles.contentListWrap}>
      <SectionTopBar
        palette={palette}
        title="Settings"
        right={(
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ThemedTextInput
              palette={palette}
              value={query}
              onChangeText={setQuery}
              placeholder="Search settings..."
              style={{ width: 240 }}
            />
            <ActionButton
              label={settingsForm.isDirty ? 'Save Changes' : 'Saved'}
              tone="primary"
              palette={palette}
              onPress={saveSettings}
              disabled={!settingsForm.isDirty}
            />
          </View>
        )}
      />

      {settingsForm.isDirty ? (
        <Text style={{ color: palette.accent, fontSize: 12, marginBottom: 8 }}>
          Unsaved changes
        </Text>
      ) : null}

      <FilterBar>
        <FilterTabs
          palette={palette}
          currentFilter={activeSection}
          onFilterChange={setActiveSection}
          collapseOnMobile
          mobileLabel="Section"
          filters={sectionTabs}
        />
      </FilterBar>

      <View style={{ gap: 16 }}>
        {visibleSections.map((section) => (
          <View key={section.id}>
            {section.render()}
          </View>
        ))}
        {visibleSections.length === 0 ? (
          <Text style={{ color: palette.textMuted }}>No settings sections match your search.</Text>
        ) : null}
      </View>
    </View>
  );
}
