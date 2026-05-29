import { useMemo, useRef, useState } from 'react'
import styled, { css } from 'styled-components'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CheckIcon from '@mui/icons-material/Check'
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined'
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined'
import DnsOutlinedIcon from '@mui/icons-material/DnsOutlined'
import LanguageOutlinedIcon from '@mui/icons-material/LanguageOutlined'
import MyLocationOutlinedIcon from '@mui/icons-material/MyLocationOutlined'
import RouterOutlinedIcon from '@mui/icons-material/RouterOutlined'

const Card = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  background: linear-gradient(180deg, rgba(30,133,255,0.10), rgba(255,255,255,0.03));
  border: 1px solid rgba(30,133,255,0.18);
  border-radius: 16px;
`

const Head = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
`

const HeadCopy = styled.button`
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.52);
  cursor: pointer;
  transition: all 0.15s ease;
  svg { font-size: 16px; }
  &:hover {
    background: rgba(30,133,255,0.14);
    border-color: rgba(30,133,255,0.30);
    color: rgba(255,255,255,0.92);
  }
  ${({ $copied }) => $copied && css`
    background: rgba(34,197,94,0.15);
    border-color: rgba(34,197,94,0.30);
    color: #4ade80;
  `}
`

const TitleWrap = styled.div`
  min-width: 0;
`

const Label = styled.p`
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.34);
`

const Title = styled.h3`
  margin-top: 4px;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  overflow-wrap: anywhere;
`

const Sub = styled.p`
  margin-top: 4px;
  font-size: 11px;
  color: rgba(255,255,255,0.32);
  overflow-wrap: anywhere;
  line-height: 1.45;
`

const MapFrame = styled.iframe`
  width: 100%;
  height: ${({ $compact }) => ($compact ? '160px' : '200px')};
  border: 0;
  border-radius: 14px;
  background: rgba(255,255,255,0.03);
`

const EmptyMap = styled.div`
  min-height: ${({ $compact }) => ($compact ? '160px' : '200px')};
  border-radius: 14px;
  border: 1px dashed rgba(255,255,255,0.10);
  background: rgba(255,255,255,0.03);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
  text-align: center;
  color: rgba(255,255,255,0.28);
  font-size: 12px;
  line-height: 1.5;
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: ${({ $compact }) => ($compact ? 'repeat(2, minmax(0, 1fr))' : 'repeat(3, minmax(0, 1fr))')};
  gap: 8px;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`

const Pill = styled.div`
  min-width: 0;
  padding: 10px 11px;
  border-radius: 12px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.07);
`

const PillLabel = styled.p`
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.28);
`

const PillValue = styled.p`
  margin-top: 4px;
  font-size: 12px;
  font-weight: 600;
  color: rgba(255,255,255,0.84);
  overflow-wrap: anywhere;
  line-height: 1.4;
`

const Actions = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`

const Action = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(30,133,255,0.12);
  border: 1px solid rgba(30,133,255,0.24);
  color: #93c5fd;
  text-decoration: none;
  font-size: 11px;
  font-weight: 700;
  transition: all 0.15s ease;
  svg { font-size: 15px; }
  &:hover {
    background: rgba(30,133,255,0.18);
    border-color: rgba(30,133,255,0.34);
    color: #dbeafe;
  }
`

const metaPairs = (geo) => {
  const location = geo?.location || {}
  const network = geo?.network || {}
  const autonomousSystem = network?.autonomousSystem || {}

  return [
    ['Ciudad', location.city || 'Sin dato'],
    ['País', location.country || 'Sin dato'],
    ['Zona horaria', location.timezone || 'Sin dato'],
    ['ASN', autonomousSystem.asn ? `AS${autonomousSystem.asn}` : 'Sin dato'],
    ['Red', network.cidr || 'Sin dato'],
    ['Hosts', network.hosts?.start && network.hosts?.end ? `${network.hosts.start} - ${network.hosts.end}` : 'Sin dato'],
  ]
}

const buildMapUrl = (lat, lng) => {
  const delta = 0.03
  const bbox = [
    (lng - delta).toFixed(4),
    (lat - delta).toFixed(4),
    (lng + delta).toFixed(4),
    (lat + delta).toFixed(4),
  ].join('%2C')
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat.toFixed(4)}%2C${lng.toFixed(4)}`
}

const isPrivateOrLocalIp = (value = '') => {
  const ip = String(value || '').trim().replace(/^::ffff:/, '')
  if (!ip) return false
  if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') return true
  if (/^10\./.test(ip)) return true
  if (/^192\.168\./.test(ip)) return true
  if (/^172\.(1[6-9]|2[0-9]|3[01])\./.test(ip)) return true
  return false
}

const SessionGeoCard = ({ geo, session, compact = false, title = 'Ubicación detectada' }) => {
  const resolvedGeo = geo || session?.geo || null
  const location = resolvedGeo?.location || {}
  const ip = session?.ip || session?.ip_address || resolvedGeo?.ip || null
  const lat = typeof location.latitude === 'number' ? location.latitude : null
  const lng = typeof location.longitude === 'number' ? location.longitude : null
  const isLocal = isPrivateOrLocalIp(ip)
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng)
  const mapUrl = useMemo(() => (hasCoords ? buildMapUrl(lat, lng) : ''), [hasCoords, lat, lng])
  const openUrl = hasCoords
    ? `https://www.openstreetmap.org/?mlat=${lat.toFixed(4)}&mlon=${lng.toFixed(4)}#map=14/${lat.toFixed(4)}/${lng.toFixed(4)}`
    : null
  const [copied, setCopied] = useState(false)
  const copyTimerRef = useRef(null)

  const handleCopy = async () => {
    const text = hasCoords
      ? `${lat.toFixed(4)}, ${lng.toFixed(4)}`
      : (ip || '')
    if (!text || !navigator.clipboard?.writeText) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.clearTimeout(copyTimerRef.current)
      copyTimerRef.current = window.setTimeout(() => setCopied(false), 1300)
    } catch {
      setCopied(false)
    }
  }

  const description = [
    location.city,
    location.country,
    ip ? `IP ${ip}` : null,
  ].filter(Boolean).join(' · ')
  const emptyCopy = isLocal
    ? 'Es una IP local o privada de desarrollo, por eso no hay geolocalización pública disponible.'
    : 'El proveedor no devolvió una ubicación con coordenadas para esta sesión.'

  return (
    <Card>
      <Head>
        <TitleWrap>
          <Label>{title}</Label>
          <Title>{location.city || location.country || ip || 'Sin geolocalización'}</Title>
          <Sub>{description || 'No pudimos resolver una ubicación para esta sesión.'}</Sub>
        </TitleWrap>
        <HeadCopy type="button" onClick={handleCopy} $copied={copied} title={hasCoords ? 'Copiar coordenadas' : 'Copiar IP'}>
          {copied ? <CheckIcon /> : <ContentCopyIcon />}
        </HeadCopy>
      </Head>

      {hasCoords ? (
        <MapFrame
          $compact={compact}
          title="Mapa de ubicación"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          src={mapUrl}
        />
      ) : (
        <EmptyMap $compact={compact}>
          {emptyCopy}
        </EmptyMap>
      )}

      <Grid $compact={compact}>
        {metaPairs(resolvedGeo).map(([label, value]) => (
          <Pill key={label}>
            <PillLabel>{label}</PillLabel>
            <PillValue>{value}</PillValue>
          </Pill>
        ))}
      </Grid>

      <Actions>
        {openUrl && (
          <Action href={openUrl} target="_blank" rel="noreferrer">
            <OpenInNewIcon />
            Abrir mapa
          </Action>
        )}
        {location.latitude != null && location.longitude != null && (
          <Pill style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 10px' }}>
            <MyLocationOutlinedIcon style={{ fontSize: 14, color: '#93c5fd' }} />
            <PillValue style={{ marginTop: 0 }}>
              {Number(location.latitude).toFixed(4)}, {Number(location.longitude).toFixed(4)}
            </PillValue>
          </Pill>
        )}
        {!hasCoords && ip && (
          <Pill style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 10px' }}>
            <PublicOutlinedIcon style={{ fontSize: 14, color: '#93c5fd' }} />
            <PillValue style={{ marginTop: 0 }}>{isLocal ? 'IP local' : ip}</PillValue>
          </Pill>
        )}
        {isLocal && (
          <Pill style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 10px' }}>
            <MyLocationOutlinedIcon style={{ fontSize: 14, color: '#93c5fd' }} />
            <PillValue style={{ marginTop: 0 }}>Sin geolocalización pública</PillValue>
          </Pill>
        )}
        {resolvedGeo?.network?.autonomousSystem?.name && (
          <Pill style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 10px' }}>
            <RouterOutlinedIcon style={{ fontSize: 14, color: '#93c5fd' }} />
            <PillValue style={{ marginTop: 0 }}>{resolvedGeo.network.autonomousSystem.name}</PillValue>
          </Pill>
        )}
        {resolvedGeo?.location?.timezone && (
          <Pill style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 10px' }}>
            <LanguageOutlinedIcon style={{ fontSize: 14, color: '#93c5fd' }} />
            <PillValue style={{ marginTop: 0 }}>{resolvedGeo.location.timezone}</PillValue>
          </Pill>
        )}
        {resolvedGeo?.network?.cidr && (
          <Pill style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 10px' }}>
            <DnsOutlinedIcon style={{ fontSize: 14, color: '#93c5fd' }} />
            <PillValue style={{ marginTop: 0 }}>{resolvedGeo.network.cidr}</PillValue>
          </Pill>
        )}
        {location.city && (
          <Pill style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 10px' }}>
            <PlaceOutlinedIcon style={{ fontSize: 14, color: '#93c5fd' }} />
            <PillValue style={{ marginTop: 0 }}>{location.city}</PillValue>
          </Pill>
        )}
      </Actions>
    </Card>
  )
}

export default SessionGeoCard
