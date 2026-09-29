import axios from 'axios';
import SystemConfig from '../models/SystemConfig';
import dotenv from 'dotenv';
dotenv.config();

export interface VirtualAccountResponse {
  bankName: string;
  accountName: string;
  accountNumber: string;
  status?: string;
  username?: string;
  [key: string]: any;
}

export interface CreateVirtualAccountParams {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  bvn?: string;
  reference?: string;
}

class VtstackService {
  private baseUrl: string = 'https://api.vtstack.ng/api';

  private async getHeaders(): Promise<{ [key: string]: string }> {
    let apiKey = process.env.VTSTACK_API_KEY || process.env.VTSTACK_SECRET_KEY || '';
    try {
      const config = await SystemConfig.findOne();
      if (config && (config as any).vtstackSecretKey && !(config as any).vtstackSecretKey.includes('test') && !(config as any).vtstackSecretKey.includes('demo')) {
        apiKey = (config as any).vtstackSecretKey;
      }
    } catch {
      // fallback to process env
    }
    return {
      'x-api-key': apiKey.trim(),
      'Content-Type': 'application/json',
    };
  }

  /**
   * Create dedicated virtual account (PalmPay) for user
   */
  async createVirtualAccount(params: CreateVirtualAccountParams): Promise<VirtualAccountResponse> {
    const accountName = `${params.firstName} ${params.lastName}`.trim() || 'Preplyx Student';
    const headers = await this.getHeaders();
    const apiKey = headers['x-api-key'];

    let formattedPhone = params.phone?.trim() || '';
    if (!formattedPhone || formattedPhone.length < 10) {
      formattedPhone = '080' + Math.floor(10000000 + Math.random() * 90000000).toString();
    }

    const payload = {
      firstName: params.firstName || 'Student',
      lastName: params.lastName || 'Preplyx',
      email: params.email,
      phone: formattedPhone,
      bvn: params.bvn || '22123456789',
      reference: params.reference || `PREPLYX_${Date.now()}_${Math.floor(Math.random() * 1000)}`
    };

    try {
      const response = await axios.post(
        `${this.baseUrl}/virtual-accounts`,
        payload,
        { headers, timeout: 15000 }
      );

      const data = response.data?.data || response.data;
      return {
        bankName: data.bankName || 'PalmPay',
        accountName: data.accountName || accountName,
        accountNumber: data.accountNumber || data.account_number,
        status: data.status || 'active',
        reference: data.reference,
        ...data
      };
    } catch (error: any) {
      const errorDetail = error?.response?.data ? JSON.stringify(error.response.data) : error.message;
      console.error('VTStack API Error:', errorDetail);
      
      // If error occurs, throw so caller is aware rather than silently storing a fake number
      throw new Error(error?.response?.data?.message || error?.message || 'Failed to create VTStack Virtual Account');
    }
  }

  /**
   * Fetch all virtual accounts
   */
  async getVirtualAccounts(): Promise<any> {
    const headers = await this.getHeaders();
    try {
      const response = await axios.get(`${this.baseUrl}/virtual-accounts`, { headers, timeout: 15000 });
      return response.data;
    } catch (error: any) {
      console.error('VTStack getVirtualAccounts Error:', error?.response?.data || error.message);
      return { success: false, message: error?.message || 'Failed to fetch virtual accounts' };
    }
  }

  /**
   * Verify bank account (Name Enquiry)
   */
  async verifyBankAccount(bankCode: string, accountNumber: string): Promise<any> {
    const headers = await this.getHeaders();
    try {
      const response = await axios.get(
        `${this.baseUrl}/banks/verify?bankCode=${bankCode}&accountNumber=${accountNumber}`,
        { headers, timeout: 15000 }
      );
      return response.data;
    } catch (error: any) {
      console.error('VTStack Name Enquiry Error:', error?.response?.data || error.message);
      return { success: false, message: error?.response?.data?.message || 'Bank resolution failed' };
    }
  }

  /**
   * List supported banks
   */
  async listBanks(): Promise<any> {
    const headers = await this.getHeaders();
    try {
      const response = await axios.get(`${this.baseUrl}/banks`, { headers, timeout: 15000 });
      return response.data;
    } catch (error: any) {
      console.error('VTStack List Banks Error:', error?.response?.data || error.message);
      return { success: false, message: error?.message || 'Failed to list banks' };
    }
  }
}

export default new VtstackService();