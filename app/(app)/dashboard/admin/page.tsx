"use client"
import useSWR from 'swr'
import { api } from '@/lib/api'

const fetcher = (url: string) => api.get(url).then(r => r.data)

export default function AdminDashboard() {
  const { data: pendingCharities, mutate: refreshCharities } = useSWR('/charities?status=PENDING', fetcher)
  const { data: pendingReports, mutate: refreshReports } = useSWR('/admin/reports/pending', (url: string) => api.get(url).then(r => r.data))

  async function approveCharity(id: string) {
    try { await api.post(`/charities/${id}/approve`); refreshCharities() } catch (e: any) { alert(e?.response?.data?.message || e?.message) }
  }
  async function rejectCharity(id: string) {
    try { await api.post(`/charities/${id}/reject`); refreshCharities() } catch (e: any) { alert(e?.response?.data?.message || e?.message) }
  }

  async function validateReport(id: string) {
    try { await api.post(`/admin/reports/${id}/validate`); refreshReports() } catch (e: any) { alert(e?.response?.data?.message || e?.message) }
  }
  async function rejectReport(id: string) {
    try { await api.post(`/admin/reports/${id}/reject`); refreshReports() } catch (e: any) { alert(e?.response?.data?.message || e?.message) }
  }

  return (
    <div className="container py-8 space-y-8">
      <h1 className="text-2xl font-semibold">Admin Control Panel</h1>

      <section>
        <h2 className="text-xl font-semibold mb-3">Pending Charity Verifications</h2>
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-black/5">
                <tr>
                  <th className="text-left px-4 py-2">Name</th>
                  <th className="text-left px-4 py-2">Description</th>
                  <th className="text-left px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingCharities?.map((c: any) => (
                  <tr key={c.id} className="border-t border-black/5">
                    <td className="px-4 py-2">{c.name}</td>
                    <td className="px-4 py-2 subtle">{c.description}</td>
                    <td className="px-4 py-2 flex gap-2">
                      <button onClick={() => approveCharity(c.id)} className="btn bg-emerald-600 hover:bg-emerald-700 text-white">Approve</button>
                      <button onClick={() => rejectCharity(c.id)} className="btn bg-red-600 hover:bg-red-700 text-white">Reject</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">Pending User Reports</h2>
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-black/5">
                <tr>
                  <th className="text-left px-4 py-2">Report</th>
                  <th className="text-left px-4 py-2">Submitted By</th>
                  <th className="text-left px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingReports?.map((r: any) => (
                  <tr key={r.id} className="border-t border-black/5">
                    <td className="px-4 py-2">{r.title || r.reason}</td>
                    <td className="px-4 py-2 subtle">{r.submittedBy || r.user}</td>
                    <td className="px-4 py-2 flex gap-2">
                      <button onClick={() => validateReport(r.id)} className="btn bg-emerald-600 hover:bg-emerald-700 text-white">Validate</button>
                      <button onClick={() => rejectReport(r.id)} className="btn bg-red-600 hover:bg-red-700 text-white">Reject</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}
