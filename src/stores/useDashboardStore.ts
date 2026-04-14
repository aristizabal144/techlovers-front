import { defineStore } from 'pinia'
import axios from 'axios'

export const useDashboardStore = defineStore('dashboard', {
    state: () => ({
        isLoading: false,
        cartera: {
            saldo_cancelado: 0,
            saldo_cartera: 0,
        },
        gastosEfectivo: {
            gastos: [] as any[],
            total_gastos: 0,
        },
        gastosTransferencia: {
            gastos: [] as any[],
            total_gastos: 0,
        },
        facturasEfectivo: [] as any[],
        facturasEfectivoTotal: 0,
        facturasTransferencia: [] as any[],
        facturasTransferenciaTotal: 0,
        ventas: [] as any[],
        totalVentas: 0,
        vales: [] as any[],
        totalVales: 0,
        resumenEfectivo: [
            { referencia: 'Ingreso en efectivo', valor: 0 },
            { referencia: 'Ingreso en transferencia', valor: 0 },
            { referencia: 'Total gastos efectivo', valor: 0 },
            { referencia: 'Total gastos transferencia', valor: 0 },
            { referencia: 'Total vales', valor: 0 },
            // Index 5: Visual separator handled in UI
            { referencia: 'Total efectivo calculado', valor: 0 },
        ],
    }),

    actions: {
        async fetchDashboardData(from: string | null, to: string | null) {
            this.isLoading = true

            const payload = { from, to }

            try {
                await Promise.allSettled([
                    this.fetchBullet(payload),
                    this.fetchInvoicePayments(payload),
                    this.fetchExpenses(payload),
                    this.fetchSales(payload),
                    this.fetchVales(payload),
                ])

                // Compute final summary calculations that depend on multiple endpoints
                this.cartera.saldo_cancelado =
                    Number(this.resumenEfectivo[0].valor) +
                    Number(this.resumenEfectivo[1].valor)

                this.resumenEfectivo[5].valor =
                    Number(this.resumenEfectivo[0].valor) -
                    Number(this.resumenEfectivo[2].valor) +
                    Number(this.resumenEfectivo[4].valor)

            } catch (error) {
                console.error('Error fetching dashboard data:', error)
            } finally {
                this.isLoading = false
            }
        },

        async fetchBullet(payload: any) {
            try {
                const response = await axios.get(import.meta.env.VITE_API_URL + '/dashboard/return-bullet', {
                    params: {
                        api_token: localStorage.getItem('app-token'),
                        ...payload
                    }
                })
                if (!response.data.is_error) {
                    this.cartera.saldo_cancelado = response.data.facturas_pagadas || 0
                    this.cartera.saldo_cartera = response.data.cartera_pendiente || 0
                }
            } catch (error) {
                console.error(error)
            }
        },

        async fetchInvoicePayments(payload: any) {
            try {
                const response = await axios.get(import.meta.env.VITE_API_URL + '/dashboard/return-invoice-payments', {
                    params: {
                        api_token: localStorage.getItem('app-token'),
                        ...payload
                    }
                })
                if (!response.data.is_error) {
                    this.facturasEfectivo = response.data.efectivo || []
                    this.facturasEfectivoTotal = response.data.efectivoTotal || 0

                    this.facturasTransferencia = response.data.transferencia || []
                    this.facturasTransferenciaTotal = response.data.transferenciaTotal || 0

                    this.resumenEfectivo[0].valor = this.facturasEfectivoTotal
                    this.resumenEfectivo[1].valor = this.facturasTransferenciaTotal
                }
            } catch (error) {
                console.error(error)
            }
        },

        async fetchExpenses(payload: any) {
            try {
                // Fetch Cash Expenses
                const efReq = axios.get(import.meta.env.VITE_API_URL + '/gastos-date', {
                    params: {
                        api_token: localStorage.getItem('app-token'),
                        ...payload,
                        type_pay: 'efectivo'
                    }
                })

                // Fetch Transfer Expenses
                const trReq = axios.get(import.meta.env.VITE_API_URL + '/gastos-date', {
                    params: {
                        api_token: localStorage.getItem('app-token'),
                        ...payload,
                        type_pay: 'transferencia'
                    }
                })

                const [efRes, trRes] = await Promise.all([efReq, trReq])

                if (!efRes.data.is_error) {
                    this.gastosEfectivo.gastos = efRes.data.data || []
                    this.gastosEfectivo.total_gastos = efRes.data.total_gastos || 0

                    this.resumenEfectivo[2].valor = this.gastosEfectivo.total_gastos
                }

                if (!trRes.data.is_error) {
                    this.gastosTransferencia.gastos = trRes.data.data || []
                    this.gastosTransferencia.total_gastos = trRes.data.total_gastos || 0

                    this.resumenEfectivo[3].valor = this.gastosTransferencia.total_gastos
                }

            } catch (error) {
                console.error(error)
            }
        },

        async fetchSales(payload: any) {
            try {
                const response = await axios.get(import.meta.env.VITE_API_URL + '/invoice/invoice-date', {
                    params: {
                        api_token: localStorage.getItem('app-token'),
                        ...payload
                    }
                })
                if (!response.data.is_error) {
                    this.ventas = response.data.data || []
                    this.totalVentas = response.data.total_facturas || 0
                }
            } catch (error) {
                console.error(error)
            }
        },

        async fetchVales(payload: any) {
            try {
                // Now fetching directly the "abonos" (payments) made to "vales"
                const response = await axios.get(import.meta.env.VITE_API_URL + '/vales-date', {
                    params: {
                        api_token: localStorage.getItem('app-token'),
                        ...payload,
                        estado: 'efectivo'
                    }
                })
                
                if (!response.data.is_error) {
                    const abonosList = response.data.data || response.data || []
                    const validAbonos = Array.isArray(abonosList) ? abonosList : []
                    
                    let sumPagados = 0
                    validAbonos.forEach((abono: any) => {
                        sumPagados += Number(abono.valor) || 0
                    })

                    this.vales = validAbonos
                    this.totalVales = sumPagados
                    this.resumenEfectivo[4].valor = this.totalVales
                }
            } catch (error) {
                console.error(error)
            }
        },
    },
})
