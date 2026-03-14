"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getStatusColor } from "@/lib/utils";

export default function Dashboard() {
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [ apps, setApps ] = useState<any[]>([]);
  const [ filter, setFilter ] = useState("All");
  const [ loading, setLoading ] = useState(true);
  const [ searchTerm, setSearchTerm ] = useState("");
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const [ currentPage, setCurrentPage ] = useState(0); // range is 0 based indexing
  const [ totalCount, setTotalCount ] = useState(0);
  const PAGE_SIZE = 25;

  const [ stats, setStats ] = useState({
    total: 0,
    internal: 0,
    external: 0,
    active: 0
  });

  const [ isAddExternalModalOpen, setIsAddExternalModalOpen ] = useState<boolean>(false);

  const [ formData, setFormData ] = useState ({
    organization: "",
    job_title: "",
    portal_url: "",
    notes: "",
    clean_status: "",
    location: ""
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
  }, []);

  useEffect(() => {
    fetchGlobalStats();
  }, []);

  useEffect(() => {
      fetchApplications();
  }, [currentPage, filter, sortOrder]); // re-run dep on changes to

  async function fetchGlobalStats() {
    const { data, error } = await supabase
      .from("applications")
      .select("source, clean_status");

    if (error) { console.error(error); }

    if (data) {
      setStats({
        total: data.length,
        internal: data.filter((a) => a.source === "internal").length,
        external: data.filter((a) => a.source === "external").length,
        active: data.filter((a) => a.clean_status !== "Not Selected").length,
      });
    }
  }

  async function fetchApplications() {
    setLoading(true);

    const from = currentPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("applications")
      .select("*", {count: "exact"})

    if (searchTerm && searchTerm.trim() !== "") {
      const s = `%${searchTerm.trim()}%`;
      query = query.or(
        `job_title.ilike.${s},organization.ilike.${s}`
      );
    }

    if (filter === "Internal") query = query.eq("source", "internal");
    if (filter === "External") query = query.eq("source", "external");
    if (filter === "Not Selected") query = query.eq("clean_status", "Not Selected");

    const { data, error, count } = await query.order(
      "date_submitted", 
      { ascending: sortOrder === 'asc',
        nullsFirst: false
      }).range(from, to);

    if (error) { console.error(error); }  
    if (data) { setApps(data) };
    if (count != null) { setTotalCount(count); }

    setLoading(false);
  }

  async function handleAddExternal(e: React.SyntheticEvent) {
    e.preventDefault();
    
    const jobID = `ext-${formData.organization.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
    const newApp = {
      ...formData,
      job_id: jobID,
      source: "external",
      date_submitted: new Date().toISOString().split('T')[0],
      app_status: formData.clean_status,
    };

    const { error } = await supabase.from("applications").insert([newApp]);

    if (error) {
      console.error("Supabase Insert Error:", error.message);
      alert(`Error: ${error.message}`);
    } else {
      setIsAddExternalModalOpen(false);
      setFormData({ organization: "", job_title: "", portal_url: "", notes: "", clean_status: "", location: "Remote" });
      fetchApplications();
      fetchGlobalStats();
    }
  }

  async function handleLogin(e: React.SyntheticEvent) {
    e.preventDefault();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    else setSession(data.session);
  }

  async function deleteApplication(id: string) {
    if (!confirm("Confirm deletion")) return;

    const { error } = await supabase
      .from("applications")
      .delete()
      .eq("id", id);

    if (!error) {
      fetchApplications();
      fetchGlobalStats();
    }
  }

  const totalPages = Math.ceil(totalCount/PAGE_SIZE);

  if (loading) {
    return <div className="p-10 text-center">Loading applications submitted</div>;
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm space-y-4">
          <h1 className="text-2xl font-bold text-slate-800">Job Tracker Login</h1>
          <input 
            type="email" placeholder="Email" 
            className="w-full p-3 rounded-lg border"
            onChange={e => setEmail(e.target.value)} 
          />
          <input 
            type="password" placeholder="Password" 
            className="w-full p-3 rounded-lg border"
            onChange={e => setPassword(e.target.value)} 
          />
          <button className="w-full bg-indigo-600 text-white p-3 rounded-lg font-bold">Sign In</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-900 font-sans">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Job Tracker</h1>
            <p className="text-slate-500 tracking-tight">Viewing {totalCount} applications</p>
          </div>
          <button 
            onClick={() => setIsAddExternalModalOpen(true)}
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition shadow-sm shadow-indigo-200"
          >
            Add External Application
          </button>
        </div>

        {/* Stats Cards*/}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Submissions" value={stats.total} color="text-slate-600" />
          <StatCard label="Internal" value={stats.internal}  color="text-slate-600"  />
          <StatCard label="External" value={stats.external} color="text-slate-600"  />
          <StatCard label="Active (Pending)" value={stats.active} color="text-slate-600" />
        </div>

        {/* Search */}
        <div className="mb-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setCurrentPage(0);
              fetchApplications();
            }}
            className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <button type="submit" className="focus:outline-none">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </button>
            </span>

            <input type="text" placeholder="Search company or role..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition"
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            />
          </form>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {["All", "Internal", "External", "Not Selected"].map((f) => (
            <button
              key={f}
              onClick={() => {
                setFilter(f);
                setCurrentPage(0);
              }}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition whitespace-nowrap shadow-sm ${
                filter === f
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Table Container*/}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200">
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500">Job Title / Org</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500">Location</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <button onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                    className="flex items-center gap-1 hover:text-indigo-600 transition">
                    Date Applied
                    <svg className={`w-4 h-4 transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-10 text-center text-slate-400 animate-pulse">
                    Refreshing list
                  </td>
                </tr>
              ) : (
                apps.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/50 transition">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="font-bold text-slate-800">{app.job_title}</div>
                        {app.portal_url && (
                          <a href={app.portal_url} target="_blank" rel="noreferrer" className="text-indigo-500 hover:text-indigo-700">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                          </a>
                        )}
                      </div>
                      <div className="text-sm text-slate-500 font-medium">{app.organization}</div>
                      {app.notes && (
                        <div className="text-[11px] text-slate-400 italic mt-1 max-w-xs truncate">{app.notes}</div>
                      )}
                    </td>
                    <td className="p-4">
                      {app.source === 'external' ? (
                        <select 
                          value={app.clean_status}
                          onChange={async (e) => {
                            const newStatus = e.target.value;
                            const { error } = await supabase
                              .from("applications")
                              .update({ clean_status: newStatus, app_status: newStatus })
                              .eq("id", app.id);
                            if (!error) fetchApplications();
                          }}
                          className={`px-2 py-1 rounded-lg text-xs font-bold uppercase border cursor-pointer outline-none ${getStatusColor(app.clean_status)}`}
                        >
                          <option>Applied</option>
                          <option>Interview</option>
                          <option>Waitlist</option>
                          <option>Offer</option>
                          <option>Not Selected</option>
                        </select>
                      ) : (
                        <StatusBadge cleanStatus={app.clean_status} />
                      )}
                    </td>
                    <td className="p-4 text-sm text-slate-600 font-medium">{app.location}</td>
                    <td className="p-4 text-sm text-slate-500">{app.date_submitted || "N/A"}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => deleteApplication(app.id)}
                          className="text-slate-300 hover:text-red-500 transition-colors"
                          title="Delete Application"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {!loading && apps.length === 0 && (
            <div className="p-20 text-center text-slate-400">No applications found matching this filter.</div>
          )}
        </div>

        {/* Pagination Controls */}
        <div className="mt-6 flex items-center justify-between bg-white px-6 py-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-sm text-slate-500 font-medium">
            Showing <span className="text-slate-900 font-bold">{currentPage * PAGE_SIZE + 1}</span> to{" "}
            <span className="text-slate-900 font-bold">{Math.min((currentPage + 1) * PAGE_SIZE, totalCount)}</span> of{" "}
            <span className="text-slate-900 font-bold">{totalCount}</span> results
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(0)}
              disabled={currentPage === 0}
              className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              First
            </button>
            <button
              onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
              disabled={currentPage === 0}
              className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              Previous
            </button>
            <div className="px-4 py-2 text-sm font-bold text-slate-900 bg-slate-50 rounded-xl border border-slate-200">
              {currentPage + 1} / {totalPages || 1}
            </div>
            <button
              onClick={() => setCurrentPage((prev) => prev + 1)}
              disabled={currentPage + 1 >= totalPages}
              className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              Next
            </button>
            <button
              onClick={() => setCurrentPage(totalPages-1)}
              disabled={currentPage === totalPages-1}
              className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              Last
            </button>
          </div>
        </div>
      </div>

      {/* Modal Overlay */}
      {isAddExternalModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800">New External Application</h2>
              <button onClick={() => setIsAddExternalModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleAddExternal} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Company</label>
                <input 
                  required
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                  value={formData.organization}
                  onChange={e => setFormData({...formData, organization: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Role / Job Title</label>
                <input 
                  required
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                  value={formData.job_title}
                  onChange={e => setFormData({...formData, job_title: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status</label>
                  <select 
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                    value={formData.clean_status}
                    onChange={e => setFormData({...formData, clean_status: e.target.value})}
                    >
                    <option>Select Status</option>
                    <option>Applied</option>
                    <option>Interview</option>
                    <option>Offer</option>
                    <option>Waitlist</option>
                    <option>Not Selected</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Location</label>
                  <input 
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                    value={formData.location}
                    onChange={e => setFormData({...formData, location: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Portal URL</label>
                <input 
                  type="url"
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.portal_url}
                  onChange={e => setFormData({...formData, portal_url: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Notes</label>
                <textarea 
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setIsAddExternalModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition"
                >
                  Save Job
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: any) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-widest text-black-400 mb-1">{label}</div>
      <div className={`text-3xl font-black ${color}`}>{value}</div>
    </div>
  );
}

function StatusBadge({ cleanStatus }: any) {
  const colorClass = getStatusColor(cleanStatus);
  return (
    <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase border ${colorClass}`}>
      {cleanStatus || "Unknown"}
    </span>
  );
}