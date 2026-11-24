export type Role = 'ADMIN' | 'RECEPTIONIST' | 'MECHANIC';
export interface User { id: string; username: string; role: Role }
export interface StoredUser extends User { passwordHash: string }
export type OrderStatus = 'RECEIVED' | 'DIAGNOSING' | 'AWAITING_AUTHORIZATION' | 'AUTHORIZED' | 'REJECTED' | 'IN_REPAIR' | 'BLOCKED' | 'COMPLETED';
export interface Client { id: string; name: string; phone: string; createdAt: string }
export interface Vehicle { id: string; clientId: string; plate: string; brand: string; model: string; createdAt: string }
export interface Order { id: string; vehicleId: string; mechanicId: string; reason: string; status: OrderStatus; createdAt: string; updatedAt: string }
export interface Diagnosis { orderId: string; findings: string; recommendedWork: string; complete: boolean; recordedBy: string; updatedAt: string }
export interface Authorization { orderId: string; decision: 'APPROVED' | 'REJECTED'; evidence: string; recordedBy: string; createdAt: string }
export interface Repair { id: string; orderId: string; activity: string; outcome: 'PROGRESS' | 'BLOCKED' | 'COMPLETED'; recordedBy: string; createdAt: string }
export interface OrderDetail extends Order { diagnosis: Diagnosis | null; authorization: Authorization | null; repairs: Repair[] }
