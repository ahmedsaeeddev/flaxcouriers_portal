import React, { useState, useContext } from "react";
import { LifeBuoy, Plus, X, MessageSquare, CheckCircle } from "lucide-react";
import TableShell from "../components/ui/TableShell";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Field from "../components/ui/Field";
import { StatusPill } from "../components/ui/Badge";
import { AppContext } from "../context/AppContext";
import { inputCls } from "../lib/constants";

export default function SupportTickets() {
  const {
    tickets,
    addTicket,
    updateTicketStatus,
    settings,
    userRole,
    currentUser,
    currentShipper,
  } = useContext(AppContext);
  const [searchValue, setSearchValue] = useState("");
  const [showModal, setShowModal] = useState(false);

  // New ticket state
  const [subj, setSubj] = useState("");

  // Selected ticket thread modal state
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyText, setReplyText] = useState("");

  const visibleTickets = userRole === "admin"
    ? tickets
    : tickets.filter((ticket) => {
        const userEmail = (currentUser?.email || "").toLowerCase();
        const ticketEmail = (ticket.customerEmail || "").toLowerCase();
        const userAccount = currentShipper?.accNum || "";
        return (
          (currentUser?.uid && ticket.customerUid === currentUser.uid) ||
          (userEmail && ticketEmail === userEmail) ||
          (userAccount && ticket.customerAccNum === userAccount)
        );
      });

  const filteredTickets = visibleTickets.filter((r) => {
    const searchLower = searchValue.toLowerCase();
    return (
      (r.id && r.id.toLowerCase().includes(searchLower)) ||
      (r.subj && r.subj.toLowerCase().includes(searchLower))
    );
  });

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!subj) {
      alert("Please enter a subject.");
      return;
    }
    await addTicket({ subj });
    setSubj("");
    setShowModal(false);
  };

  const handleSendReply = async () => {
    if (!selectedTicket || !replyText) return;
    await updateTicketStatus(selectedTicket.id, selectedTicket.status, replyText);
    setReplyText("");
    setSelectedTicket(null);
  };

  const handleMarkResolved = async (ticketId) => {
    await updateTicketStatus(ticketId, "Delivered", "Ticket resolved and closed.");
    if (selectedTicket && selectedTicket.id === ticketId) {
      setSelectedTicket(null);
    }
  };

  const YELLOW = settings.accentColor || "#F4C430";

  return (
    <div className="relative">
      <TableShell
        title="Support Tickets"
        subtitle="Customer inquiries, delivery exceptions and issue resolution"
        actions={
          <Button onClick={() => setShowModal(true)}>
            <Plus size={15} /> Open Ticket
          </Button>
        }
        searchValue={searchValue}
        onSearchChange={(e) => setSearchValue(e.target.value)}
        searchPlaceholder="Search tickets by ID or subject..."
        columns={["Ticket ID", "Subject", "Status", "Date", "Action"]}
        rows={filteredTickets}
        renderRow={(r, i) => (
          <tr key={r.id || i} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
            <td className="py-3.5 font-semibold text-[#0A2342] pr-4">{r.id}</td>
            <td className="py-3.5 text-slate-600 pr-4">{r.subj}</td>
            <td className="py-3.5 pr-4">
              <StatusPill s={r.status === "Delivered" ? "Delivered" : r.status === "In Transit" ? "In Transit" : "Pending"} />
            </td>
            <td className="py-3.5 text-slate-400 pr-4">{r.date}</td>
            <td className="py-3.5">
              <button
                onClick={() => setSelectedTicket(r)}
                className="text-xs font-semibold text-[#0A2342] hover:underline flex items-center gap-1"
              >
                <MessageSquare size={14} /> View Thread
              </button>
            </td>
          </tr>
        )}
      />

      {/* Open Ticket Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0" onClick={() => setShowModal(false)} />
          <Card className="p-6 w-full max-w-md relative z-10 animate-fadeUp max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="font-display font-bold text-[#0A2342] text-[16px] flex items-center gap-2">
                <LifeBuoy size={18} style={{ color: YELLOW }} /> Open Support Ticket
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <Field label="Issue Subject *">
                <input
                  required
                  value={subj}
                  onChange={(e) => setSubj(e.target.value)}
                  className={inputCls}
                  placeholder="e.g. Delayed delivery for shipment FLX..."
                />
              </Field>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit">Submit Ticket</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* View Thread Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0" onClick={() => setSelectedTicket(null)} />
          <Card className="p-6 w-full max-w-lg relative z-10 animate-fadeUp space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-display font-bold text-[#0A2342] text-[16px]">{selectedTicket.id}: {selectedTicket.subj}</h3>
                <p className="text-xs text-slate-400 mt-0.5">Opened: {selectedTicket.date}</p>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2.5 p-3 bg-slate-50 rounded-xl scrollbar-thin">
              <div className="p-3 bg-white rounded-lg border border-slate-100 text-xs">
                <p className="font-bold text-[#0A2342]">Customer Request</p>
                <p className="text-slate-600 mt-1">{selectedTicket.subj}</p>
              </div>
              {(selectedTicket.replies || []).map((rep, idx) => (
                <div key={idx} className="p-3 bg-blue-50/60 rounded-lg border border-blue-100 text-xs ml-4">
                  <div className="flex justify-between font-bold text-blue-900">
                    <span>{rep.sender}</span>
                    <span className="text-[10px] text-blue-400 font-normal">{rep.time}</span>
                  </div>
                  <p className="text-blue-800 mt-1">{rep.text}</p>
                </div>
              ))}
            </div>

            {selectedTicket.status !== "Delivered" ? (
              <div className="space-y-2 pt-2">
                <textarea
                  rows={2}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={userRole === "admin" ? "Type support response..." : "Reply to support..."}
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-[#F4C430]/20"
                />
                <div className="flex justify-between items-center">
                  {userRole === "admin" ? (
                    <button
                      onClick={() => handleMarkResolved(selectedTicket.id)}
                      className="text-xs font-semibold text-emerald-700 flex items-center gap-1 hover:underline"
                    >
                      <CheckCircle size={14} /> Mark as Resolved
                    </button>
                  ) : <span />}
                  <Button onClick={handleSendReply} disabled={!replyText.trim()}>
                    {userRole === "admin" ? "Send Reply" : "Send to Support"}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-center text-xs text-emerald-700 font-semibold bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
                ✓ This ticket has been resolved and closed.
              </p>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
