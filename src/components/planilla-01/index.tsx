'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { 
  FileText, Download, Search, Loader2, Truck, User, Building2,
  Eye, FileSpreadsheet, FileDown
} from 'lucide-react'
import { TextoEditable, EditableBlock, useEditor } from '@/components/ui/editable-screen'

interface Operador { id: string; nombre: string; rol: string }

interface Tropa {
  id: string
  numero: number
  codigo: string
  cantidadCabezas: number
  especie: string
  dte: string
  guia: string
  fechaRecepcion: string
  corral?: { nombre: string }
  productor?: { nombre: string; cuit: string }
  usuarioFaena: { nombre: string; cuit: string }
  pesajeCamion?: {
    patenteChasis: string
    patenteAcoplado?: string
    choferNombre?: string
    choferDni?: string
    transportista?: { nombre: string; cuit: string }
    precintos?: string
  }
  animales: Array<{
    id: string
    numero: number
    tipoAnimal: string
    caravana?: string
    pesoVivo?: number
    raza?: string
  }>
}

interface Props { operador: Operador }

const TIPOS_ANIMAL_LABELS: Record<string, string> = {
  'TO': 'TORO', 'VA': 'VACA', 'VQ': 'VAQUILLONA', 'MEJ': 'MEJ', 'NO': 'NOVILLO', 'NT': 'NOVILLITO',
}

export function Planilla01Module({ operador }: Props) {
  const { editMode, getTexto } = useEditor()
  const [tropas, setTropas] = useState<Tropa[]>([])
  const [tropaSeleccionada, setTropaSeleccionada] = useState<Tropa | null>(null)
  const [loading, setLoading] = useState(true)
  const [buscando, setBuscando] = useState(false)
  const [generando, setGenerando] = useState<'excel' | 'pdf' | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [mostrarTodas, setMostrarTodas] = useState(false)

  useEffect(() => { fetchTropas('') }, [])

  const fetchTropas = async (termino: string) => {
    if (termino) setBuscando(true)
    else setLoading(true)
    try {
      const params = new URLSearchParams()
      if (termino) params.set('busqueda', termino)
      const url = `/api/tropas${params.toString() ? '?' + params.toString() : ''}`
      const res = await fetch(url)
      const data = await res.json()
      if (data.success) {
        setTropas(data.data || [])
        setMostrarTodas(false)
        if (!data.data?.length) {
          toast.info(termino ? `No se encontraron tropas para "${termino}"` : 'No hay tropas cargadas. Ejecutá el seed primero.')
        }
      } else {
        console.error('API Error:', data.error)
        toast.error(`Error: ${data.error || 'Sin respuesta del servidor'}`)
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error de conexión al cargar tropas')
    } finally {
      setLoading(false)
      setBuscando(false)
    }
  }

  const handleBuscar = () => {
    if (busqueda.trim()) {
      fetchTropas(busqueda.trim())
    } else {
      fetchTropas('')
    }
  }

  const handleVerTodas = () => {
    setBusqueda('')
    fetchTropas('')
    setMostrarTodas(true)
  }

  const handleSeleccionarTropa = async (tropaId: string) => {
    try {
      const res = await fetch(`/api/tropas/${tropaId}`)
      const data = await res.json()
      if (data.success) setTropaSeleccionada(data.data)
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al cargar tropa')
    }
  }

  const handleGenerarExcel = async () => {
    if (!tropaSeleccionada) return
    setGenerando('excel')
    try {
      const res = await fetch('/api/planilla01', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tropaId: tropaSeleccionada.id })
      })
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Error al generar Excel')
      }
      
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Planilla01_${tropaSeleccionada.codigo?.replace(/\s/g, '_') || tropaSeleccionada.id}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('Excel generado correctamente')
    } catch (error) {
      console.error('Error:', error)
      toast.error(error instanceof Error ? error.message : 'Error al generar Excel')
    } finally {
      setGenerando(null)
    }
  }

  const handleGenerarPDF = async () => {
    if (!tropaSeleccionada) return
    setGenerando('pdf')
    try {
      const doc = new jsPDF('landscape', 'mm', 'a4')
      const pageWidth = doc.internal.pageSize.getWidth()
      const m = 8 // margin
      let y = 10

      // ===== ENCABEZADO =====
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('PLANILLA 01 - BOVINO', m, y)
      doc.setFontSize(20)
      doc.text(`TROPA N\u00b0 ${tropaSeleccionada.numero || tropaSeleccionada.codigo || '-'}`, pageWidth - m, y, { align: 'right' })
      y += 5
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text('REGISTRO DE INGRESO DE HACIENDA', pageWidth / 2, y, { align: 'center' })
      y += 6

      // ===== ESTABLECIMIENTO =====
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text('ESTABLECIMIENTO: SOLEMAR ALIMENTARIA S.A.', m, y)
      doc.setFont('helvetica', 'normal')
      doc.text('SENASA: 3986', m + 100, y)
      doc.text('MATR\u00cdCULA: 300', m + 130, y)
      const getSem = (fecha: string) => {
        const d = new Date(fecha)
        const start = new Date(d.getFullYear(), 0, 1)
        return Math.ceil(((d.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7)
      }
      doc.setFont('helvetica', 'bold')
      doc.text('Sem.:', m + 170, y)
      doc.setFont('helvetica', 'normal')
      doc.text(getSem(tropaSeleccionada.fechaRecepcion).toString(), m + 180, y)
      doc.setFont('helvetica', 'bold')
      doc.text('Fecha:', m + 200, y)
      doc.setFont('helvetica', 'normal')
      doc.text(new Date(tropaSeleccionada.fechaRecepcion).toLocaleDateString('es-AR'), m + 212, y)
      doc.setFont('helvetica', 'bold')
      doc.text('Hora:', m + 240, y)
      doc.setFont('helvetica', 'normal')
      doc.text(tropaSeleccionada.fechaRecepcion ? new Date(tropaSeleccionada.fechaRecepcion).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '-', m + 252, y)
      y += 5

      // L\u00ednea separadora
      doc.setDrawColor(0)
      doc.setLineWidth(0.5)
      doc.line(m, y, pageWidth - m, y)
      y += 4

      // --- Fila 1: Productor ---
      doc.setFont('helvetica', 'bold')
      doc.text('PRODUCTOR:', m, y)
      doc.setFont('helvetica', 'normal')
      doc.text(tropaSeleccionada.productor?.nombre || '-', m + 20, y)
      doc.setFont('helvetica', 'bold')
      doc.text('CUIT:', m + 120, y)
      doc.setFont('helvetica', 'normal')
      doc.text(tropaSeleccionada.productor?.cuit || '-', m + 132, y)
      doc.setFont('helvetica', 'bold')
      doc.text('TROPA N\u00b0:', m + 190, y)
      doc.setFont('helvetica', 'normal')
      doc.text(tropaSeleccionada.numero?.toString() || tropaSeleccionada.codigo || '-', m + 212, y)
      doc.setFont('helvetica', 'bold')
      doc.text('CABEZAS:', m + 245, y)
      doc.setFont('helvetica', 'normal')
      doc.text(String(tropaSeleccionada.cantidadCabezas), m + 268, y)
      y += 5

      // --- Fila 2: Usuario Faena ---
      doc.setFont('helvetica', 'bold')
      doc.text('USUARIO FAENA:', m, y)
      doc.setFont('helvetica', 'normal')
      doc.text(tropaSeleccionada.usuarioFaena?.nombre || '-', m + 28, y)
      doc.setFont('helvetica', 'bold')
      doc.text('CUIT:', m + 120, y)
      doc.setFont('helvetica', 'normal')
      doc.text(tropaSeleccionada.usuarioFaena?.cuit || '-', m + 132, y)
      doc.setFont('helvetica', 'bold')
      doc.text('CORRAL:', m + 190, y)
      doc.setFont('helvetica', 'normal')
      doc.text(tropaSeleccionada.corral?.nombre || '-', m + 212, y)
      y += 5

      // --- Transporte ---
      doc.setFont('helvetica', 'bold')
      doc.text('TRANSPORTE:', m, y)
      doc.setFont('helvetica', 'normal')
      doc.text(tropaSeleccionada.pesajeCamion?.transportista?.nombre || '-', m + 24, y)
      doc.setFont('helvetica', 'bold')
      doc.text('CHOFER:', m + 90, y)
      doc.setFont('helvetica', 'normal')
      doc.text(tropaSeleccionada.pesajeCamion?.choferNombre || '-', m + 107, y)
      doc.setFont('helvetica', 'bold')
      doc.text('DNI:', m + 150, y)
      doc.setFont('helvetica', 'normal')
      doc.text(tropaSeleccionada.pesajeCamion?.choferDni || '-', m + 160, y)
      y += 5

      doc.setFont('helvetica', 'bold')
      doc.text('PATENTE CHASIS:', m, y)
      doc.setFont('helvetica', 'normal')
      doc.text(tropaSeleccionada.pesajeCamion?.patenteChasis || '-', m + 30, y)
      doc.setFont('helvetica', 'bold')
      doc.text('ACOPLADO:', m + 60, y)
      doc.setFont('helvetica', 'normal')
      doc.text(tropaSeleccionada.pesajeCamion?.patenteAcoplado || '-', m + 82, y)
      doc.setFont('helvetica', 'bold')
      doc.text('PRECINTOS:', m + 120, y)
      doc.setFont('helvetica', 'normal')
      doc.text(tropaSeleccionada.pesajeCamion?.precintos || '-', m + 142, y)
      doc.setFont('helvetica', 'bold')
      doc.text('N\u00b0 PESADA:', m + 190, y)
      doc.setFont('helvetica', 'normal')
      doc.text(String(tropaSeleccionada.pesajeCamion?.numeroTicket || '-'), m + 215, y)
      y += 5

      // --- Documentaci\u00f3n ---
      doc.setFont('helvetica', 'bold')
      doc.text('GU\u00cdA:', m, y)
      doc.setFont('helvetica', 'normal')
      doc.text(tropaSeleccionada.guia || '-', m + 15, y)
      doc.setFont('helvetica', 'bold')
      doc.text('DTE:', m + 120, y)
      doc.setFont('helvetica', 'normal')
      doc.text(tropaSeleccionada.dte || '-', m + 132, y)
      y += 5

      // L\u00ednea separadora
      doc.setDrawColor(0)
      doc.setLineWidth(0.5)
      doc.line(m, y, pageWidth - m, y)
      y += 3

      // ===== TABLA DE ANIMALES =====
      const animalesData = (tropaSeleccionada.animales || []).map((a, idx) => [
        idx + 1,
        a.caravana || '-',
        TIPOS_ANIMAL_LABELS[a.tipoAnimal] || a.tipoAnimal || '-',
        a.raza || '-',
        a.pesajeIndividual?.peso?.toFixed(1) || a.pesoVivo?.toFixed(1) || '-',
        ''
      ])

      const totalKg = (tropaSeleccionada.animales || []).reduce((sum, a) => sum + (a.pesajeIndividual?.peso || a.pesoVivo || 0), 0)
      const totalAnimales = (tropaSeleccionada.animales || []).length
      const pesoPromedio = totalAnimales > 0 ? totalKg / totalAnimales : 0
      const kgNetosCamion = tropaSeleccionada.pesajeCamion?.pesoNeto ?? null
      const diferenciaKg = kgNetosCamion !== null ? kgNetosCamion - totalKg : null

      autoTable(doc, {
        startY: y,
        head: [['N\u00ba', 'TIPO', 'PESO ENTRADA (kg)', 'CARAVANA', 'CORRAL']],
        body: animalesData.map(row => [row[0], row[2], row[4], row[1], tropaSeleccionada.corral?.nombre || '']),
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 22, halign: 'center' },
          2: { cellWidth: 30, halign: 'right' },
          3: { cellWidth: 35, halign: 'center' },
          4: { cellWidth: 20, halign: 'center' }
        },
        margin: { left: m, right: m }
      })

      // ===== TOTALES =====
      const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text(`TOTALES:  Cabezas: ${totalAnimales}  |  Suma Pesos Indiv.: ${totalKg.toFixed(1)} kg  |  Peso Promedio: ${pesoPromedio.toFixed(1)} kg`, m, finalY)

      // ===== 4 CUADROS COMPARATIVOS =====
      let cy = finalY + 5
      doc.setDrawColor(0)
      doc.setLineWidth(0.3)
      doc.line(m, cy, pageWidth - m, cy)
      cy += 2

      const boxW = 55
      const boxH = 14
      const boxGap = 15
      const bx = m

      // Cuadro 1: Kg Netos Cami\u00f3n
      doc.setDrawColor(120)
      doc.setFillColor(240, 240, 240)
      doc.roundedRect(bx, cy, boxW, boxH, 1.5, 1.5, 'FD')
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(80)
      doc.text('KG NETOS CAMI\u00d3N', bx + 3, cy + 4)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(kgNetosCamion !== null ? kgNetosCamion.toFixed(1) + ' kg' : 'S/D', bx + 3, cy + 11)
      doc.setTextColor(0)

      // Cuadro 2: Kg Netos Individuales
      const b2x = bx + boxW + boxGap
      doc.setDrawColor(120)
      doc.setFillColor(240, 240, 240)
      doc.roundedRect(b2x, cy, boxW, boxH, 1.5, 1.5, 'FD')
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(80)
      doc.text('KG NETOS INDIVIDUALES', b2x + 3, cy + 4)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(totalKg.toFixed(1) + ' kg', b2x + 3, cy + 11)
      doc.setTextColor(0)

      // Cuadro 3: Diferencia
      const b3x = b2x + boxW + boxGap
      doc.setDrawColor(120)
      doc.setFillColor(240, 240, 240)
      doc.roundedRect(b3x, cy, boxW, boxH, 1.5, 1.5, 'FD')
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(80)
      doc.text('DIFERENCIA (Cam. - Indiv.)', b3x + 3, cy + 4)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(diferenciaKg !== null ? ((diferenciaKg >= 0 ? '+' : '') + diferenciaKg.toFixed(1) + ' kg') : 'Sin pesada cami\u00f3n', b3x + 3, cy + 11)
      doc.setTextColor(0)

      // Cuadro 4: Promedio
      const b4x = b3x + boxW + boxGap
      doc.setDrawColor(120)
      doc.setFillColor(240, 240, 240)
      doc.roundedRect(b4x, cy, 45, boxH, 1.5, 1.5, 'FD')
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(80)
      doc.text('PROMEDIO KG NETOS', b4x + 3, cy + 4)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(pesoPromedio.toFixed(1) + ' kg', b4x + 3, cy + 11)
      doc.setTextColor(0)

      cy += boxH + 5

      // ===== OBSERVACIONES =====
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text('OBSERVACIONES:', m, cy)
      doc.rect(m, cy + 2, pageWidth - m * 2, 10)
      if (tropaSeleccionada.observaciones) {
        doc.setFont('helvetica', 'normal')
        doc.text(tropaSeleccionada.observaciones, m + 2, cy + 7, { maxWidth: pageWidth - m * 2 - 4 })
      }

      cy += 18

      // ===== FIRMAS =====
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.text('FIRMA RESPONSABLE:', m + 10, cy)
      doc.text('SELLO:', pageWidth / 2 + 30, cy)
      doc.rect(m + 5, cy + 3, 70, 15)
      doc.rect(pageWidth / 2 + 25, cy + 3, 70, 15)

      // ===== PIE DE P\u00c1GINA =====
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        doc.text(`P\u00e1gina ${i} de ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 5, { align: 'center' })
      }

      // Guardar
      doc.save(`Planilla01_${tropaSeleccionada.codigo?.replace(/\s/g, '_') || tropaSeleccionada.id}.pdf`)
      toast.success('PDF generado correctamente')
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al generar PDF')
    } finally {
      setGenerando(null)
    }
  }

  // Las tropas ya vienen filtradas desde el servidor cuando hay búsqueda

  const getSemana = (fecha: string) => {
    const d = new Date(fecha)
    const start = new Date(d.getFullYear(), 0, 1)
    return Math.ceil(((d.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <EditableBlock bloqueId="header" label="Encabezado">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-stone-800 flex items-center gap-2">
                <FileText className="w-8 h-8 text-amber-500" />
                <TextoEditable id="planilla01-titulo" original="Planilla 01 - Registro de Ingreso" tag="span" />
              </h1>
              <p className="text-stone-500 mt-1">
                <TextoEditable id="planilla01-subtitulo" original="Planilla SENASA para registro de ingreso de hacienda" tag="span" />
              </p>
            </div>
            {tropaSeleccionada && (
              <div className="flex gap-2">
                <Button onClick={handleGenerarExcel} disabled={generando !== null} className="bg-emerald-600 hover:bg-emerald-700">
                  {generando === 'excel' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 mr-2" />}
                  <TextoEditable id="btn-excel" original="Excel" tag="span" />
                </Button>
                <Button onClick={handleGenerarPDF} disabled={generando !== null} className="bg-red-600 hover:bg-red-700">
                  {generando === 'pdf' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileDown className="w-4 h-4 mr-2" />}
                  <TextoEditable id="btn-pdf" original="PDF" tag="span" />
                </Button>
              </div>
            )}
          </div>
        </EditableBlock>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <EditableBlock bloqueId="lista-tropas" label="Lista de Tropas">
            <Card className="border-0 shadow-md lg:col-span-1">
              <CardHeader className="bg-stone-50">
                <CardTitle className="text-lg">
                  <TextoEditable id="planilla01-seleccionar-tropa" original="Seleccionar Tropa" tag="span" />
                </CardTitle>
                <div className="flex gap-2 mt-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <Input 
                      placeholder="Código, productor, CUIT..." 
                      value={busqueda} 
                      onChange={(e) => setBusqueda(e.target.value)} 
                      className="pl-9"
                      onKeyDown={(e) => { if (e.key === 'Enter') handleBuscar() }}
                    />
                  </div>
                  <Button onClick={handleBuscar} disabled={buscando} className="bg-amber-600 hover:bg-amber-700 shrink-0">
                    {buscando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    <TextoEditable id="planilla01-btn-buscar" original="Buscar" tag="span" />
                  </Button>
                </div>
                {busqueda && !mostrarTodas && (
                  <button 
                    onClick={handleVerTodas} 
                    className="text-xs text-amber-600 hover:text-amber-800 mt-1 underline"
                  >
                    Ver todas las tropas
                  </button>
                )}
              </CardHeader>
              <CardContent className="p-0 max-h-[500px] overflow-y-auto">
                {loading ? (
                  <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-500" /></div>
                ) : tropas.length === 0 ? (
                  <div className="p-8 text-center text-stone-400">
                    <TextoEditable id="planilla01-no-hay-tropas" original="No hay tropas" tag="span" />
                  </div>
                ) : (
                  <div className="divide-y">
                    {tropas.map((tropa) => (
                      <button key={tropa.id} onClick={() => handleSeleccionarTropa(tropa.id)}
                        className={`w-full p-4 text-left hover:bg-stone-50 transition-colors ${tropaSeleccionada?.id === tropa.id ? 'bg-amber-50 border-l-4 border-amber-500' : ''}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-stone-800">{tropa.codigo}</p>
                            <p className="text-sm text-stone-500">{tropa.usuarioFaena?.nombre || tropa.productor?.nombre}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline">{tropa.cantidadCabezas} cab.</Badge>
                            <p className="text-xs text-stone-400 mt-1">{new Date(tropa.fechaRecepcion).toLocaleDateString('es-AR')}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </EditableBlock>

          <EditableBlock bloqueId="vista-previa" label="Vista Previa">
            <Card className="border-0 shadow-md lg:col-span-2">
              <CardHeader className="bg-stone-50">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  <TextoEditable id="planilla01-vista-previa" original="Vista Previa" tag="span" />
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {!tropaSeleccionada ? (
                  <div className="text-center py-12 text-stone-400">
                    <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>
                      <TextoEditable id="planilla01-seleccione-tropa" original="Seleccione una tropa para ver la planilla" tag="span" />
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="border-2 border-stone-300 rounded-lg p-4 bg-white">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-amber-500" />
                            <span className="font-semibold">Solemar Alimentaria S.A.</span>
                          </div>
                          <div className="text-stone-600">
                            <span className="font-medium">
                              <TextoEditable id="planilla01-nro-senasa-label" original="N° SENASA:" tag="span" />
                            </span> 3986
                          </div>
                          <div className="text-stone-600">
                            <span className="font-medium">
                              <TextoEditable id="planilla01-matricula-label" original="Matrícula:" tag="span" />
                            </span> 300
                          </div>
                        </div>
                        <div className="space-y-2 text-right">
                          <Badge className="bg-amber-100 text-amber-800 text-base px-4 py-1">
                            <TextoEditable id="planilla01-badge" original="PLANILLA 01 - BOVINO" tag="span" />
                          </Badge>
                          <div className="text-stone-600">
                            <span className="font-medium">
                              <TextoEditable id="planilla01-semana-label" original="Semana N°:" tag="span" />
                            </span> {getSemana(tropaSeleccionada.fechaRecepcion)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border rounded-lg p-4 bg-white space-y-2">
                        <h4 className="font-semibold text-stone-700 flex items-center gap-2">
                          <User className="w-4 h-4 text-amber-500" />
                          <TextoEditable id="planilla01-productor-title" original="Usuario Faena" tag="span" />
                        </h4>
                        <div className="text-sm space-y-1">
                          <p>
                            <span className="font-medium">
                              <TextoEditable id="planilla01-nombre-label" original="Nombre:" tag="span" />
                            </span> {tropaSeleccionada.usuarioFaena?.nombre || tropaSeleccionada.productor?.nombre || '-'}
                          </p>
                          <p>
                            <span className="font-medium">
                              <TextoEditable id="planilla01-cuit-label" original="CUIT:" tag="span" />
                            </span> {tropaSeleccionada.usuarioFaena?.cuit || tropaSeleccionada.productor?.cuit || '-'}
                          </p>
                        </div>
                      </div>
                      <div className="border rounded-lg p-4 bg-white space-y-2">
                        <h4 className="font-semibold text-stone-700 flex items-center gap-2">
                          <User className="w-4 h-4 text-amber-500" />
                          <TextoEditable id="planilla01-usuario-title" original="Productor / Titular" tag="span" />
                        </h4>
                        <div className="text-sm space-y-1">
                          <p>
                            <span className="font-medium">
                              <TextoEditable id="planilla01-nombre-label2" original="Nombre:" tag="span" />
                            </span> {tropaSeleccionada.productor?.nombre || '-'}
                          </p>
                          <p>
                            <span className="font-medium">
                              <TextoEditable id="planilla01-cuit-label2" original="CUIT:" tag="span" />
                            </span> {tropaSeleccionada.productor?.cuit || '-'}
                          </p>
                        </div>
                      </div>
                      <div className="border rounded-lg p-4 bg-white space-y-2">
                        <h4 className="font-semibold text-stone-700 flex items-center gap-2">
                          <Truck className="w-4 h-4 text-amber-500" />
                          <TextoEditable id="planilla01-transporte-title" original="Transporte" tag="span" />
                        </h4>
                        <div className="text-sm space-y-1">
                          <p>
                            <span className="font-medium">
                              <TextoEditable id="planilla01-transportista-label" original="Transportista:" tag="span" />
                            </span> {tropaSeleccionada.pesajeCamion?.transportista?.nombre || '-'}
                          </p>
                          <p>
                            <span className="font-medium">
                              <TextoEditable id="planilla01-chofer-label" original="Chofer:" tag="span" />
                            </span> {tropaSeleccionada.pesajeCamion?.choferNombre || '-'}
                          </p>
                          <p>
                            <span className="font-medium">
                              <TextoEditable id="planilla01-patente-label" original="Patente Chasis:" tag="span" />
                            </span> {tropaSeleccionada.pesajeCamion?.patenteChasis || '-'}
                          </p>
                        </div>
                      </div>
                      <div className="border rounded-lg p-4 bg-white space-y-2">
                        <h4 className="font-semibold text-stone-700 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-amber-500" />
                          <TextoEditable id="planilla01-documentos-title" original="Documentos" tag="span" />
                        </h4>
                        <div className="text-sm space-y-1">
                          <p>
                            <span className="font-medium">
                              <TextoEditable id="planilla01-nro-tropa-label" original="N° Tropa:" tag="span" />
                            </span> {tropaSeleccionada.codigo}
                          </p>
                          <p>
                            <span className="font-medium">DTE:</span> {tropaSeleccionada.dte || '-'}
                          </p>
                          <p>
                            <span className="font-medium">
                              <TextoEditable id="planilla01-guia-label" original="Guía:" tag="span" />
                            </span> {tropaSeleccionada.guia || '-'}
                          </p>
                          <p>
                            <span className="font-medium">
                              <TextoEditable id="planilla01-precintos-label" original="Precintos:" tag="span" />
                            </span> {tropaSeleccionada.pesajeCamion?.precintos || '-'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="border rounded-lg overflow-hidden bg-white">
                      <div className="bg-stone-100 px-4 py-2 border-b">
                        <h4 className="font-semibold text-stone-700">
                          <TextoEditable id="planilla01-detalle-animales" original="Detalle de Animales" tag="span" /> ({tropaSeleccionada.animales?.length || 0})
                        </h4>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-stone-50">
                            <TableHead className="w-16 text-center">N°</TableHead>
                            <TableHead className="text-center">
                              <TextoEditable id="planilla01-th-tipo" original="Tipo" tag="span" />
                            </TableHead>
                            <TableHead>
                              <TextoEditable id="planilla01-th-raza" original="Raza" tag="span" />
                            </TableHead>
                            <TableHead>
                              <TextoEditable id="planilla01-th-caravana" original="Caravana" tag="span" />
                            </TableHead>
                            <TableHead className="text-right">
                              <TextoEditable id="planilla01-th-peso" original="Peso (kg)" tag="span" />
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tropaSeleccionada.animales?.slice(0, 20).map((animal, idx) => (
                            <TableRow key={animal.id}>
                              <TableCell className="text-center font-medium">{animal.numero || idx + 1}</TableCell>
                              <TableCell className="text-center"><Badge variant="outline">{TIPOS_ANIMAL_LABELS[animal.tipoAnimal] || animal.tipoAnimal}</Badge></TableCell>
                              <TableCell>{animal.raza || '-'}</TableCell>
                              <TableCell className="font-mono text-sm">{animal.caravana || '-'}</TableCell>
                              <TableCell className="text-right">{animal.pesoVivo?.toFixed(0) || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </EditableBlock>
        </div>
      </div>
    </div>
  )
}

export default Planilla01Module
