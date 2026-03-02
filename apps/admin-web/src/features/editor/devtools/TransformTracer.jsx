import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { palettePropTypes } from '@components/prop-types';

function StepButton({ label, stepIndex, isActive, onPress, palette }) {
  return (
    <Pressable
      onPress={() => onPress(stepIndex)}
      style={[
        styles.stepButton,
        {
          backgroundColor: isActive ? palette.accent : palette.surface,
          borderColor: isActive ? palette.accent : palette.border
        }
      ]}
    >
      <Text
        style={[
          styles.stepNumber,
          { color: isActive ? palette.onAccent : palette.textMuted }
        ]}
      >
        {stepIndex + 1}
      </Text>
      <Text
        style={[
          styles.stepLabel,
          { color: isActive ? palette.onAccent : palette.text }
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

StepButton.propTypes = {
  label: PropTypes.string.isRequired,
  stepIndex: PropTypes.number.isRequired,
  isActive: PropTypes.bool,
  onPress: PropTypes.func.isRequired,
  palette: PropTypes.shape(palettePropTypes).isRequired
};

function TraceDataView({ data, palette }) {
  if (data === undefined || data === null) {
    return (
      <Text style={[styles.emptyData, { color: palette.textMuted }]}>
        No data
      </Text>
    );
  }

  const formatted = typeof data === 'object'
    ? JSON.stringify(data, null, 2)
    : String(data);

  return (
    <ScrollView
      style={[styles.dataScrollView, { backgroundColor: palette.surfaceMuted }]}
      horizontal={false}
    >
      <Text
        style={[styles.dataText, { color: palette.text }]}
        selectable
      >
        {formatted}
      </Text>
    </ScrollView>
  );
}

TraceDataView.propTypes = {
  data: PropTypes.any,
  palette: PropTypes.shape(palettePropTypes).isRequired
};

export function TransformTracer({
  tracerData,
  tracerStep,
  onStepChange,
  onPrev,
  onNext,
  palette
}) {
  if (!tracerData) {
    return (
      <View style={styles.emptyState}>
        <Text style={{ color: palette.textMuted }}>
          Select a block in the Blocks tab to trace its transformation
        </Text>
      </View>
    );
  }

  const steps = Array.isArray(tracerData.steps) ? tracerData.steps : [];
  if (steps.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={{ color: palette.textMuted }}>
          Trace data has no steps to display
        </Text>
      </View>
    );
  }
  const currentStep = steps[tracerStep] || steps[0];

  return (
    <View style={styles.container}>
      <View style={[styles.stepsRow, { borderColor: palette.border }]}>
        {steps.map((step, index) => (
          <StepButton
            key={`${step.label}-${index}`}
            label={step.label}
            stepIndex={index}
            isActive={tracerStep === index}
            onPress={onStepChange}
            palette={palette}
          />
        ))}
      </View>

      <View style={styles.navigationRow}>
        <Pressable
          onPress={onPrev}
          disabled={tracerStep === 0}
          style={[
            styles.navButton,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
              opacity: tracerStep === 0 ? 0.5 : 1
            }
          ]}
        >
          <Text style={{ color: palette.text }}>← Prev</Text>
        </Pressable>

        <Text style={[styles.stepIndicator, { color: palette.textMuted }]}>
          Step {tracerStep + 1} of {steps.length}
        </Text>

        <Pressable
          onPress={onNext}
          disabled={tracerStep === steps.length - 1}
          style={[
            styles.navButton,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
              opacity: tracerStep === steps.length - 1 ? 0.5 : 1
            }
          ]}
        >
          <Text style={{ color: palette.text }}>Next →</Text>
        </Pressable>
      </View>

      <View style={styles.dataContainer}>
        <Text style={[styles.dataTitle, { color: palette.text }]}>
          {currentStep?.label}
        </Text>
        <TraceDataView data={currentStep?.data} palette={palette} />
      </View>
    </View>
  );
}

TransformTracer.propTypes = {
  tracerData: PropTypes.shape({
    steps: PropTypes.arrayOf(PropTypes.shape({
      label: PropTypes.string.isRequired,
      data: PropTypes.any
    })).isRequired
  }),
  tracerStep: PropTypes.number.isRequired,
  onStepChange: PropTypes.func.isRequired,
  onPrev: PropTypes.func.isRequired,
  onNext: PropTypes.func.isRequired,
  palette: PropTypes.shape(palettePropTypes).isRequired
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  stepsRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    borderBottomWidth: 1
  },
  stepButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    borderWidth: 1,
    gap: 6
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '700'
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '500'
  },
  navigationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    gap: 12
  },
  navButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1
  },
  stepIndicator: {
    fontSize: 12
  },
  dataContainer: {
    flex: 1,
    padding: 12
  },
  dataTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8
  },
  dataScrollView: {
    flex: 1,
    borderRadius: 4,
    padding: 12
  },
  dataText: {
    fontSize: 11,
    fontFamily: 'monospace',
    lineHeight: 18
  },
  emptyData: {
    fontSize: 12,
    fontStyle: 'italic'
  }
});
