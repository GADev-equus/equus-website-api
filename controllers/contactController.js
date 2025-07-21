const Contact = require('../models/Contact');

const contactController = {
  async getAllContacts(req, res) {
    try {
      const {
        status,
        page = 1,
        limit = 20,
        search,
        sort = 'createdAt',
        order = 'desc'
      } = req.query;

      const query = {};

      if (status && ['pending', 'read', 'replied', 'archived'].includes(status)) {
        query.status = status;
      }

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { subject: { $regex: search, $options: 'i' } },
          { message: { $regex: search, $options: 'i' } }
        ];
      }

      const sortOrder = order === 'asc' ? 1 : -1;
      const sortObj = { [sort]: sortOrder };

      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
      const skip = (pageNum - 1) * limitNum;

      const [contacts, totalCount] = await Promise.all([
        Contact.find(query)
          .sort(sortObj)
          .skip(skip)
          .limit(limitNum)
          .select('-__v')
          .lean(),
        Contact.countDocuments(query)
      ]);

      const totalPages = Math.ceil(totalCount / limitNum);
      const hasNext = pageNum < totalPages;
      const hasPrev = pageNum > 1;

      res.status(200).json({
        success: true,
        contacts,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalItems: totalCount,
          itemsPerPage: limitNum,
          hasNext,
          hasPrev
        }
      });

    } catch (error) {
      console.error('Get contacts error:', error.message);
      res.status(500).json({
        success: false,
        error: 'Server Error',
        message: 'Failed to retrieve contacts',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  async getContactById(req, res) {
    try {
      const { id } = req.params;

      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Invalid contact ID format'
        });
      }

      const contact = await Contact.findById(id).select('-__v');

      if (!contact) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Contact not found'
        });
      }

      res.status(200).json({
        success: true,
        contact
      });

    } catch (error) {
      console.error('Get contact by ID error:', error.message);
      res.status(500).json({
        success: false,
        error: 'Server Error',
        message: 'Failed to retrieve contact',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  async updateContactStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Invalid contact ID format'
        });
      }

      if (!status || !['pending', 'read', 'replied', 'archived'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Status must be one of: pending, read, replied, archived'
        });
      }

      const contact = await Contact.findById(id);

      if (!contact) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Contact not found'
        });
      }

      contact.status = status;

      if (status === 'read' && !contact.metadata.readAt) {
        contact.metadata.readAt = new Date();
      } else if (status === 'replied' && !contact.metadata.repliedAt) {
        contact.metadata.repliedAt = new Date();
        if (!contact.metadata.readAt) {
          contact.metadata.readAt = new Date();
        }
      }

      await contact.save();

      console.log(`✅ Contact ${id} status updated to: ${status}`);

      res.status(200).json({
        success: true,
        message: `Contact status updated to ${status}`,
        contact
      });

    } catch (error) {
      console.error('Update contact status error:', error.message);
      
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: 'Server Error',
        message: 'Failed to update contact status',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  async getContactStats(req, res) {
    try {
      const [statusStats, totalCount, todayCount, weekCount, monthCount] = await Promise.all([
        Contact.aggregate([
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 }
            }
          }
        ]),
        Contact.countDocuments({}),
        Contact.countDocuments({
          createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
        }),
        Contact.countDocuments({
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }),
        Contact.countDocuments({
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        })
      ]);

      const stats = {
        total: totalCount,
        pending: 0,
        read: 0,
        replied: 0,
        archived: 0,
        todaySubmissions: todayCount,
        weekSubmissions: weekCount,
        monthSubmissions: monthCount
      };

      statusStats.forEach(stat => {
        if (stat._id && stats.hasOwnProperty(stat._id)) {
          stats[stat._id] = stat.count;
        }
      });

      res.status(200).json({
        success: true,
        stats
      });

    } catch (error) {
      console.error('Get contact stats error:', error.message);
      res.status(500).json({
        success: false,
        error: 'Server Error',
        message: 'Failed to retrieve contact statistics',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  async deleteContact(req, res) {
    try {
      const { id } = req.params;

      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Invalid contact ID format'
        });
      }

      const contact = await Contact.findById(id);

      if (!contact) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Contact not found'
        });
      }

      await Contact.findByIdAndDelete(id);

      console.log(`✅ Contact ${id} deleted successfully`);

      res.status(200).json({
        success: true,
        message: 'Contact deleted successfully'
      });

    } catch (error) {
      console.error('Delete contact error:', error.message);
      res.status(500).json({
        success: false,
        error: 'Server Error',
        message: 'Failed to delete contact',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  async getRecentContacts(req, res) {
    try {
      const { limit = 5 } = req.query;
      const limitNum = Math.max(1, Math.min(20, parseInt(limit)));

      const recentContacts = await Contact.find({})
        .sort({ createdAt: -1 })
        .limit(limitNum)
        .select('name email subject status createdAt emailSent -_id')
        .lean();

      res.status(200).json({
        success: true,
        contacts: recentContacts
      });

    } catch (error) {
      console.error('Get recent contacts error:', error.message);
      res.status(500).json({
        success: false,
        error: 'Server Error',
        message: 'Failed to retrieve recent contacts',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};

module.exports = contactController;