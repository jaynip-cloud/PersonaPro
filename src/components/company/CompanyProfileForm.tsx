import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Input } from '../ui/Input';
import { CompanyProfile } from '../../types';

interface CompanyProfileFormProps {
  profile: CompanyProfile;
  onUpdate: (profile: CompanyProfile) => void;
}

export const CompanyProfileForm: React.FC<CompanyProfileFormProps> = ({
  profile,
  onUpdate
}) => {
  const handleChange = (field: keyof CompanyProfile, value: any) => {
    onUpdate({ ...profile, [field]: value });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Company Name
              </label>
              <Input
                type="text"
                value={profile.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Your company name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Company Description
              </label>
              <textarea
                value={profile.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Describe your company..."
                className="w-full min-h-[100px] border border-border rounded-md px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Value Proposition
              </label>
              <textarea
                value={profile.valueProposition}
                onChange={(e) => handleChange('valueProposition', e.target.value)}
                placeholder="What unique value do you provide to clients?"
                className="w-full min-h-[100px] border border-border rounded-md px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {profile.team.map((member, index) => (
              <div
                key={index}
                className="p-4 border border-border rounded-lg bg-muted/20"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      Name
                    </label>
                    <Input
                      type="text"
                      value={member.name}
                      onChange={(e) => {
                        const newTeam = [...profile.team];
                        newTeam[index] = { ...member, name: e.target.value };
                        handleChange('team', newTeam);
                      }}
                      placeholder="Name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      Role
                    </label>
                    <Input
                      type="text"
                      value={member.role}
                      onChange={(e) => {
                        const newTeam = [...profile.team];
                        newTeam[index] = { ...member, role: e.target.value };
                        handleChange('team', newTeam);
                      }}
                      placeholder="Role"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      Specialization
                    </label>
                    <Input
                      type="text"
                      value={member.specialization || ''}
                      onChange={(e) => {
                        const newTeam = [...profile.team];
                        newTeam[index] = { ...member, specialization: e.target.value };
                        handleChange('team', newTeam);
                      }}
                      placeholder="Specialization"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
