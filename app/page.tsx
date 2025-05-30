"use client";

import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useEffect, useState } from "react";
import { MeiliSearch } from 'meilisearch'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

// Initialize MeiliSearch client
const searchClient = new MeiliSearch({
  host: process.env.NEXT_PUBLIC_MEILISEARCH_URL!,
  apiKey: process.env.NEXT_PUBLIC_MEILISEARCH_API_KEY
});

// Define the Professional type
interface Professional {
  _id: string;
  ProfessionalId: number;
  FirstName: string;
  LastName: string;
  MiddleName: string;
  PreferredName: string;
  SupervisorName: string;
  Suffix: string | null;
  Pronoun: string | null;
  BusinessPhone: string;
  MobilePhone: string;
  BusinessEmail: string;
  Title: string;
  ExpertiseName: string;
  Overview: string;
  OverviewReadMore: string;
  OfficeLocation: string;
  OfficeRegion: string;
  EducationRecords: Array<{
    ProfessionalId: number;
    School: string;
    Degree: string;
    YearOfDegree: number;
    Concentration: string;
    Honors: string | null;
    SortOrder: number;
    UniversityCity: string | null;
    CountryCode: string;
    StateCode: string | null;
  }>;
  Capabilities: Array<{
    ProfessionalId: number;
    CapabilityName: string;
    SortOrder: number;
  }>;
  StateLicenses: Array<{
    ProfessionalId: number;
    State: string;
    LicenseTitle: string;
    SortOrder: number;
  }>;
}

// Add these interfaces near the top with other interfaces
interface FacetDistribution {
  [key: string]: {
    [value: string]: number;
  };
}

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmbedder, setSelectedEmbedder] = useState('default');
  const [semanticRatio, setSemanticRatio] = useState(0.5);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [selectedOfficeLocations, setSelectedOfficeLocations] = useState<string[]>([]);
  const [selectedExpertise, setSelectedExpertise] = useState<string[]>([]);
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>([]);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedLicenseTitles, setSelectedLicenseTitles] = useState<string[]>([]);
  const [facetDistribution, setFacetDistribution] = useState<FacetDistribution>({});
  const [allPossibleFacets, setAllPossibleFacets] = useState<FacetDistribution>({});
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);

  // Handle search
  useEffect(() => {
    const searchProfessionals = async () => {
      // First, get the current filter state
      const currentFilters = [
        ...(selectedOfficeLocations.length > 0 
          ? [`OfficeLocation IN [${selectedOfficeLocations.map(loc => `"${loc}"`).join(', ')}]`] 
          : []),
        ...(selectedExpertise.length > 0 
          ? [`ExpertiseName IN [${selectedExpertise.map(exp => `"${exp}"`).join(', ')}]`] 
          : []),
        ...(selectedCapabilities.length > 0 
          ? [`Capabilities.CapabilityName IN [${selectedCapabilities.map(cap => `"${cap}"`).join(', ')}]`] 
          : []),
        ...(selectedStates.length > 0 
          ? [`StateLicenses.State IN [${selectedStates.map(state => `"${state}"`).join(', ')}]`] 
          : []),
        ...(selectedLicenseTitles.length > 0 
          ? [`StateLicenses.LicenseTitle IN [${selectedLicenseTitles.map(license => `"${license}"`).join(', ')}]`] 
          : []),
      ];

      try {
        // Get search results and facets in a single query
        const results = await searchClient.index('professionals').search(searchQuery, {
          attributesToRetrieve: ['_id', 'FirstName', 'LastName', 'Suffix', 'Title', 'ExpertiseName', 'OfficeLocation', 'EducationRecords', 'Overview', 'OverviewReadMore', 'Capabilities', 'StateLicenses'],
          hybrid: {
            embedder: selectedEmbedder,
            semanticRatio: semanticRatio
          },
          facets: [
            'OfficeLocation',
            'ExpertiseName',
            'Capabilities.CapabilityName',
            'StateLicenses.State',
            'StateLicenses.LicenseTitle'
          ],
          filter: currentFilters
        });
        
        // Create final facets keeping all possible values
        const finalFacets: FacetDistribution = {};
        Object.keys(allPossibleFacets).forEach(key => {
          finalFacets[key] = {};
          // Get all possible values for this facet
          const allValues = Object.keys(allPossibleFacets[key] || {});
          // For each value, use the count from MeiliSearch if available, otherwise 0
          allValues.forEach(value => {
            finalFacets[key][value] = results.facetDistribution?.[key]?.[value] || 0;
          });
        });

        setProfessionals(results.hits as Professional[]);
        setFacetDistribution(finalFacets);
      } catch (error) {
        console.error('Error updating search results:', error);
      }
    };

    // Add a small delay to prevent too many requests when rapidly unchecking filters
    const timeoutId = setTimeout(() => {
      searchProfessionals();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedOfficeLocations, selectedExpertise, selectedCapabilities, 
      selectedStates, selectedLicenseTitles, allPossibleFacets, selectedEmbedder, semanticRatio]);

  // Add a new effect to fetch all possible facets on component mount
  useEffect(() => {
    const fetchAllFacets = async () => {
      try {
        const results = await searchClient.index('professionals').search('', {
          facets: ['*'],
          limit: 0 // We only need facets, not results
        });
        setAllPossibleFacets(results.facetDistribution || {});
      } catch (error) {
        console.error('Error fetching all facets:', error);
      }
    };

    fetchAllFacets();
  }, []); // Run once on mount

  return (
    <div className="min-h-screen p-4">
      {/* Header with search input */}
      <header className="mb-8 max-w-5xl mx-auto">
        <div className="flex gap-4 items-center">
          <Input 
            type="search" 
            placeholder="Search professionals..." 
            className="flex-1"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Select
            value={selectedEmbedder}
            onValueChange={setSelectedEmbedder}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select embedder" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="text-1">Text 1</SelectItem>
              <SelectItem value="text-2">Text 2</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 w-[200px]">
            <span className="text-sm text-muted-foreground">Semantic Ratio:</span>
            <Slider
              value={[semanticRatio]}
              onValueChange={([value]) => setSemanticRatio(value)}
              min={0}
              max={1}
              step={0.1}
              className="w-[100px]"
            />
            <span className="text-sm text-muted-foreground">{semanticRatio.toFixed(1)}</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="max-w-7xl mx-auto grid grid-cols-[250px_1fr] gap-8">
        {/* Filters sidebar */}
        <aside className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg">Filters</CardTitle>
              {(selectedOfficeLocations.length > 0 || selectedExpertise.length > 0 || 
                selectedCapabilities.length > 0 || selectedStates.length > 0 || 
                selectedLicenseTitles.length > 0) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedOfficeLocations([]);
                    setSelectedExpertise([]);
                    setSelectedCapabilities([]);
                    setSelectedStates([]);
                    setSelectedLicenseTitles([]);
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              <Accordion type="single" collapsible className="space-y-4">
                {/* Office Location Accordion Item */}
                <AccordionItem value="office-location">
                  <div className="flex items-center justify-between">
                    <AccordionTrigger>Office Location</AccordionTrigger>
                    {selectedOfficeLocations.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOfficeLocations([]);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <AccordionContent>
                    <div className="space-y-2">
                      {facetDistribution['OfficeLocation'] && 
                        Object.entries(facetDistribution['OfficeLocation'])
                          .sort(([,a], [,b]) => b - a)
                          .map(([location, count]) => (
                            <div key={location} className="flex items-center space-x-2">
                              <Checkbox 
                                id={`location-${location}`}
                                checked={selectedOfficeLocations.includes(location)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedOfficeLocations([...selectedOfficeLocations, location]);
                                  } else {
                                    setSelectedOfficeLocations(selectedOfficeLocations.filter(l => l !== location));
                                  }
                                }}
                              />
                              <label htmlFor={`location-${location}`} className="flex-1">
                                {location}
                              </label>
                              <span className="text-sm text-muted-foreground">({count})</span>
                            </div>
                          ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Expertise Accordion Item */}
                <AccordionItem value="expertise">
                  <div className="flex items-center justify-between">
                    <AccordionTrigger>Expertise</AccordionTrigger>
                    {selectedExpertise.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedExpertise([]);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <AccordionContent>
                    <div className="space-y-2">
                      {facetDistribution['ExpertiseName'] && 
                        Object.entries(facetDistribution['ExpertiseName'])
                          .sort(([,a], [,b]) => b - a)
                          .map(([expertise, count]) => (
                            <div key={expertise} className="flex items-center space-x-2">
                              <Checkbox 
                                id={`expertise-${expertise}`}
                                checked={selectedExpertise.includes(expertise)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedExpertise([...selectedExpertise, expertise]);
                                  } else {
                                    setSelectedExpertise(selectedExpertise.filter(e => e !== expertise));
                                  }
                                }}
                              />
                              <label htmlFor={`expertise-${expertise}`} className="flex-1">
                                {expertise}
                              </label>
                              <span className="text-sm text-muted-foreground">({count})</span>
                            </div>
                          ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Capabilities Accordion Item */}
                <AccordionItem value="capabilities">
                  <div className="flex items-center justify-between">
                    <AccordionTrigger>Capabilities</AccordionTrigger>
                    {selectedCapabilities.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCapabilities([]);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <AccordionContent>
                    <div className="space-y-2">
                      {facetDistribution['Capabilities.CapabilityName'] && 
                        Object.entries(facetDistribution['Capabilities.CapabilityName'])
                          .sort(([,a], [,b]) => b - a)
                          .map(([capability, count]) => (
                            <div key={capability} className="flex items-center space-x-2">
                              <Checkbox 
                                id={`capability-${capability}`}
                                checked={selectedCapabilities.includes(capability)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedCapabilities([...selectedCapabilities, capability]);
                                  } else {
                                    setSelectedCapabilities(selectedCapabilities.filter(c => c !== capability));
                                  }
                                }}
                              />
                              <label htmlFor={`capability-${capability}`} className="flex-1">
                                {capability}
                              </label>
                              <span className="text-sm text-muted-foreground">({count})</span>
                            </div>
                          ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* State Licenses Accordion Item */}
                <AccordionItem value="state-licenses">
                  <div className="flex items-center justify-between">
                    <AccordionTrigger>State Licenses</AccordionTrigger>
                    {selectedStates.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedStates([]);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <AccordionContent>
                    <div className="space-y-2">
                      {facetDistribution['StateLicenses.State'] && 
                        Object.entries(facetDistribution['StateLicenses.State'])
                          .sort(([,a], [,b]) => b - a)
                          .map(([state, count]) => (
                            <div key={state} className="flex items-center space-x-2">
                              <Checkbox 
                                id={`state-${state}`}
                                checked={selectedStates.includes(state)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedStates([...selectedStates, state]);
                                  } else {
                                    setSelectedStates(selectedStates.filter(s => s !== state));
                                  }
                                }}
                              />
                              <label htmlFor={`state-${state}`} className="flex-1">
                                {state}
                              </label>
                              <span className="text-sm text-muted-foreground">({count})</span>
                            </div>
                          ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* License Titles Accordion Item */}
                <AccordionItem value="license-titles">
                  <div className="flex items-center justify-between">
                    <AccordionTrigger>License Titles</AccordionTrigger>
                    {selectedLicenseTitles.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLicenseTitles([]);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <AccordionContent>
                    <div className="space-y-2">
                      {facetDistribution['StateLicenses.LicenseTitle'] && 
                        Object.entries(facetDistribution['StateLicenses.LicenseTitle'])
                          .sort(([,a], [,b]) => b - a)
                          .map(([license, count]) => (
                            <div key={license} className="flex items-center space-x-2">
                              <Checkbox 
                                id={`license-${license}`}
                                checked={selectedLicenseTitles.includes(license)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedLicenseTitles([...selectedLicenseTitles, license]);
                                  } else {
                                    setSelectedLicenseTitles(selectedLicenseTitles.filter(l => l !== license));
                                  }
                                }}
                              />
                              <label htmlFor={`license-${license}`} className="flex-1">
                                {license}
                              </label>
                              <span className="text-sm text-muted-foreground">({count})</span>
                            </div>
                          ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </aside>

        {/* Search results */}
        <main>
          <div className="space-y-4">
            {professionals.map((professional) => (
              <Card 
                key={professional._id} 
                className="mb-4 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setSelectedProfessional(professional)}
              >
                <CardHeader>
                  <CardTitle>
                    {professional.FirstName} {professional.LastName}
                    {professional.Suffix && `, ${professional.Suffix}`}
                  </CardTitle>
                  <CardDescription>
                    {professional.Title}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p>{professional.ExpertiseName}, {professional.OfficeLocation}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Professional Details Dialog */}
          <Dialog open={!!selectedProfessional} onOpenChange={() => setSelectedProfessional(null)}>
            {selectedProfessional && (
              <DialogContent className="max-w-4xl max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>
                    {selectedProfessional.FirstName} {selectedProfessional.LastName}
                    {selectedProfessional.Suffix && `, ${selectedProfessional.Suffix}`}
                  </DialogTitle>
                  <div className="text-sm text-muted-foreground">
                    {selectedProfessional.Title}
                  </div>
                </DialogHeader>
                
                <ScrollArea className="h-full max-h-[calc(80vh-100px)]">
                  <div className="grid gap-4">
                    <div className="space-y-4">
                      <div>
                        <p className="mt-2">{selectedProfessional.ExpertiseName}, {selectedProfessional.OfficeLocation}</p>
                      </div>

                      {/* Education */}
                      {selectedProfessional.EducationRecords && selectedProfessional.EducationRecords.length > 0 && (
                        <div className="space-y-2">
                          <h3 className="font-semibold">Education</h3>
                          {selectedProfessional.EducationRecords.map((education, index) => (
                            <p key={index}>
                              {education.Degree} in {education.Concentration}, {education.School} ({education.YearOfDegree})
                            </p>
                          ))}
                        </div>
                      )}

                      {/* Overview */}
                      {selectedProfessional.Overview && (
                        <div className="space-y-2">
                          <h3 className="font-semibold">Overview</h3>
                          <p>{selectedProfessional.Overview}</p>
                          {selectedProfessional.OverviewReadMore && (
                            <p>{selectedProfessional.OverviewReadMore}</p>
                          )}
                        </div>
                      )}

                      {/* Capabilities */}
                      {selectedProfessional.Capabilities && selectedProfessional.Capabilities.length > 0 && (
                        <div className="space-y-2">
                          <h3 className="font-semibold">Capabilities</h3>
                          <div className="flex flex-wrap gap-2">
                            {selectedProfessional.Capabilities.map((capability, index) => (
                              <span key={index} className="px-2 py-1 bg-secondary rounded-md text-sm">
                                {capability.CapabilityName}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </ScrollArea>
              </DialogContent>
            )}
          </Dialog>
        </main>
      </div>
    </div>
  );
}
