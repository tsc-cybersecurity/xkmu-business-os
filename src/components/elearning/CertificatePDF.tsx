import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#ffffff',
    padding: 60,
    fontFamily: 'Helvetica',
  },
  border: {
    borderWidth: 4,
    borderColor: '#0f172a',
    borderStyle: 'solid',
    flexGrow: 1,
    padding: 50,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topBlock: {
    alignItems: 'center',
    width: '100%',
  },
  brand: {
    fontSize: 12,
    color: '#64748b',
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 48,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginTop: 24,
  },
  subtitle: {
    fontSize: 14,
    color: '#475569',
    marginTop: 12,
  },
  recipientLabel: {
    fontSize: 12,
    color: '#64748b',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 32,
  },
  recipient: {
    fontSize: 32,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginTop: 12,
  },
  courseLabel: {
    fontSize: 12,
    color: '#64748b',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 32,
  },
  courseTitle: {
    fontSize: 22,
    color: '#1e293b',
    marginTop: 12,
    textAlign: 'center',
    maxWidth: 500,
  },
  bottomBlock: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  bottomColumn: {
    flexDirection: 'column',
  },
  smallLabel: {
    fontSize: 9,
    color: '#94a3b8',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  smallValue: {
    fontSize: 11,
    color: '#1e293b',
    marginTop: 4,
  },
  identifier: {
    fontSize: 9,
    color: '#94a3b8',
    fontFamily: 'Courier',
    marginTop: 4,
  },
})

export interface CertificatePDFProps {
  organizationName: string
  recipientName: string
  courseTitle: string
  issuedAt: Date
  identifier: string
}

export function CertificatePDF({
  organizationName,
  recipientName,
  courseTitle,
  issuedAt,
  identifier,
}: CertificatePDFProps) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.border}>
          <View style={styles.topBlock}>
            <Text style={styles.brand}>{organizationName}</Text>
            <Text style={styles.title}>Zertifikat</Text>
            <Text style={styles.subtitle}>
              wird hiermit verliehen an
            </Text>

            <Text style={styles.recipientLabel}>Teilnehmer/in</Text>
            <Text style={styles.recipient}>{recipientName}</Text>

            <Text style={styles.courseLabel}>für den erfolgreichen Abschluss von</Text>
            <Text style={styles.courseTitle}>{courseTitle}</Text>
          </View>

          <View style={styles.bottomBlock}>
            <View style={styles.bottomColumn}>
              <Text style={styles.smallLabel}>Ausgestellt am</Text>
              <Text style={styles.smallValue}>
                {issuedAt.toLocaleDateString('de-DE', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
            </View>
            <View style={[styles.bottomColumn, { alignItems: 'flex-end' }]}>
              <Text style={styles.smallLabel}>Verifikations-ID</Text>
              <Text style={styles.identifier}>{identifier}</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}
