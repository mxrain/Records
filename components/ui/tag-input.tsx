import React, { useState, useEffect, useCallback } from 'react';
import { Combobox } from '@headlessui/react';
import { Check, ChevronsUpDown } from 'lucide-react';

interface TagOption {
  category: string;
  subcategory: string;
  label: string;
}

interface TagInputProps {
  options: Record<string, any>;
  value: string[];
  onChange: (selected: string[]) => void;
}

export function TagInput({ options, value, onChange }: TagInputProps) {
  const [query, setQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(value || []);

  useEffect(() => {
    setSelectedTags(value || []);
  }, [value]);

  const handleChange = useCallback((newTags: string[]) => {
    const uniqueTags = Array.from(new Set(newTags));
    setSelectedTags(uniqueTags);
    onChange(uniqueTags);
  }, [onChange]);

  const flattenedOptions: TagOption[] = React.useMemo(() => {
    const result: TagOption[] = [];
    Object.entries(options).forEach(([key, val]) => {
      // 适配扁平结构 { id: { name: "显示名" } }
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        const name = (val as Record<string, any>).name;
        if (typeof name === 'string') {
          result.push({ category: '', subcategory: '', label: name });
          return;
        }
        // 适配嵌套结构 { category: { subcategory: [tags] } }
        Object.entries(val as Record<string, any>).forEach(([subcategory, tags]) => {
          if (Array.isArray(tags)) {
            tags.forEach((tag: string) => {
              result.push({ category: key, subcategory, label: tag });
            });
          }
        });
      } else if (Array.isArray(val)) {
        // 适配 { category: [tags] }
        val.forEach((tag: string) => {
          result.push({ category: key, subcategory: '', label: tag });
        });
      }
    });
    return result;
  }, [options]);

  const filteredOptions = React.useMemo(() => 
    query === ''
      ? flattenedOptions
      : flattenedOptions.filter((option) =>
          option.label.toLowerCase().includes(query.toLowerCase())
        ),
    [query, flattenedOptions]
  );

  const handleSelect = useCallback((tag: string) => {
    handleChange(selectedTags.includes(tag) 
      ? selectedTags.filter((t) => t !== tag) 
      : [...selectedTags, tag]
    );
  }, [selectedTags, handleChange]);

  return (
    <div className="w-full relative">
      <Combobox value={selectedTags} onChange={handleChange} multiple>
        <div className="relative">
          <Combobox.Input
            className="w-full border rounded-md py-2 pl-3 pr-10 text-sm"
            onChange={(event) => setQuery(event.target.value)}
            displayValue={(tags: string[]) => tags.join(', ')}
            placeholder="选择或输入标签..."
          />
          <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronsUpDown className="h-4 w-4 text-gray-400" />
          </Combobox.Button>
        </div>
        {filteredOptions.length > 0 && (
          <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
            {filteredOptions.map((option, idx) => (
              <Combobox.Option
                key={`${option.category}-${option.subcategory}-${option.label}-${idx}`}
                value={option.label}
                className={({ active }) =>
                  `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                    active ? 'bg-teal-600 text-white' : 'text-gray-900'
                  }`
                }
              >
                {({ selected, active }) => (
                  <>
                    <span
                      className={`block truncate ${
                        selected ? 'font-medium' : 'font-normal'
                      }`}
                    >
                      {option.label}
                    </span>
                    {selected ? (
                      <span
                        className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                          active ? 'text-white' : 'text-teal-600'
                        }`}
                      >
                        <Check className="h-5 w-5" />
                      </span>
                    ) : null}
                  </>
                )}
              </Combobox.Option>
            ))}
          </Combobox.Options>
        )}
      </Combobox>
      <div className="mt-2 flex flex-wrap gap-2">
        {selectedTags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center rounded-full bg-teal-100 px-3 py-1 text-sm font-semibold text-teal-700"
          >
            {tag}
            <button
              type="button"
              className="ml-2 text-teal-500 hover:text-teal-700"
              onClick={() => handleSelect(tag)}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}